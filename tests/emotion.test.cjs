const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const jsx = require('react/jsx-runtime');

// Exercise the actual component handlers without adding a DOM test dependency.
// Browser layout, native keyboard activation, and focus still need visual QA.
function harness(file, imports = {}) {
  const slots = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (value) => {
        slots[index] = typeof value === 'function' ? value(slots[index]) : value;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      return slots[index] ??= { current: initial };
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!slots[index] || dependencies.some((value, i) => value !== slots[index][i])) {
        effect();
        slots[index] = dependencies;
      }
    },
    useSyncExternalStore: () => true,
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const listeners = {};
  const location = new URL('http://localhost/');
  const history = {
    pushState(_state, _title, url) { location.href = String(url); },
  };
  vm.runInNewContext(code, {
    exports: module.exports,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return jsx;
      if (name === '@/captcha/types') return { defineStep: (step) => step };
      if (name in imports) return imports[name];
      throw Error(`Unexpected import: ${name}`);
    },
    window: {
      location, history,
      addEventListener: (name, handler) => { listeners[name] = handler; },
      removeEventListener: (name) => { delete listeners[name]; },
    },
    URL, URLSearchParams, Date,
  });
  return {
    exported: module.exports.default,
    render(component, props = {}) { cursor = 0; return component(props); },
    location, listeners,
  };
}

function elements(tree) {
  if (Array.isArray(tree)) return tree.flatMap(elements);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...elements(tree.props?.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  return tree?.props ? text(tree.props.children) : '';
}
function button(tree, label) {
  const found = elements(tree).find((node) => node.type === 'button' &&
    (node.props['aria-label'] === label || text(node) === label));
  assert.ok(found, `Missing button: ${label}`);
  return found;
}
function emotion() {
  const instance = harness('src/steps/05-emotion.tsx');
  const calls = { pass: 0, fail: 0, restart: 0 };
  const props = Object.fromEntries(Object.keys(calls).map((key) => [key, () => calls[key]++]));
  return { calls, render: () => instance.render(instance.exported.Component, props) };
}

test('all rejected ratings return to a fresh selection without passing', () => {
  const labels = ['Reconsider my rating', 'Try feeling something', "Prove I'm human", "I'm not a robot!"];
  for (let rating = 2; rating <= 5; rating++) {
    const instance = emotion();
    button(instance.render(), `${rating} stars`).props.onClick();
    let tree = instance.render();
    assert.equal(instance.calls.pass, 0);
    assert.equal(instance.calls.fail, 1);
    assert.match(text(tree), /Wrong/);
    assert.doesNotMatch(text(tree), /ROBOT DETECTED/);
    button(tree, labels[rating - 2]).props.onClick();
    tree = instance.render();
    assert.match(text(tree), /Select a rating to continue/);
    assert.equal(elements(tree).filter((node) => node.props?.['aria-pressed'] === true).length, 0);
    assert.equal(instance.calls.pass, 0);
  }
});

test('one star requires two confirmations, swaps once, and passes only once', () => {
  const instance = emotion();
  button(instance.render(), '1 star').props.onClick();
  let tree = instance.render();
  const actions = (view) => elements(view).filter((node) => node.type === 'button' && !node.props['aria-label']).map(text);
  assert.deepEqual(actions(tree), ["Yes, I'm sure", "Actually, let's try again"]);
  button(tree, "Yes, I'm sure").props.onClick();
  assert.equal(instance.calls.pass, 0);
  tree = instance.render();
  assert.match(text(tree), /Still sure\?/);
  assert.deepEqual(actions(tree), ["Actually, let's try again", "Yes, I'm sure"]);
  assert.deepEqual(actions(instance.render()), actions(tree));
  const confirm = button(tree, "Yes, I'm sure");
  confirm.props.onClick();
  confirm.props.onClick();
  assert.equal(instance.calls.pass, 1);
});

test('restart retains its action in both confirmation positions', () => {
  for (const second of [false, true]) {
    const instance = emotion();
    button(instance.render(), '1 star').props.onClick();
    if (second) button(instance.render(), "Yes, I'm sure").props.onClick();
    button(instance.render(), "Actually, let's try again").props.onClick();
    assert.equal(instance.calls.restart, 1);
    assert.equal(instance.calls.pass, 0);
  }
});

test('stars preview on hover and focus and retain selection', () => {
  const instance = emotion();
  button(instance.render(), '3 stars').props.onFocus();
  let tree = instance.render();
  assert.match(button(tree, '3 stars').props.className, /text-amber-400/);
  assert.match(button(tree, '4 stars').props.className, /text-neutral-300/);
  button(tree, '3 stars').props.onBlur();
  tree = instance.render();
  assert.match(button(tree, '3 stars').props.className, /text-neutral-300/);
  button(tree, '1 star').props.onMouseEnter();
  assert.match(button(instance.render(), '1 star').props.className, /text-amber-400/);
  button(instance.render(), '1 star').props.onClick();
  tree = instance.render();
  assert.equal(button(tree, '1 star').props['aria-pressed'], true);
  assert.equal(button(tree, '5 stars').props.disabled, true);
});

test('flow restart resets statistics and history restores login and challenges safely', () => {
  const Empty = () => null;
  const instance = harness('src/captcha/CaptchaFlow.tsx', {
    '@/steps': { steps: Array.from({ length: 5 }, () => ({ Component: Empty })) },
    './DevBar': { default: Empty, devBarEnabled: () => false },
    './FinalScreen': { default: Empty },
    './LoginScreen': { default: Empty },
  });
  const outer = instance.render(instance.exported);
  const Flow = elements(outer).find((node) => typeof node.type === 'function').type;
  instance.location.search = '?step=5';
  let tree = instance.render(Flow);
  const stepView = () => elements(tree).find((node) => node.props?.stepKey);
  stepView().props.fail('Wrong');
  tree = instance.render(Flow);
  stepView().props.restart();
  tree = instance.render(Flow);
  assert.equal(stepView().props.index, 0);
  assert.equal(stepView().props.message, '');
  assert.equal(instance.location.search, '?step=1');
  stepView().props.pass();
  tree = instance.render(Flow);
  assert.equal(stepView().props.index, 1);
  for (const [query, expected] of [['?step=5', 4], ['?step=1', 0]]) {
    instance.location.search = query;
    instance.listeners.popstate();
    tree = instance.render(Flow);
    assert.equal(stepView().props.index, expected);
  }
  for (const query of ['', '?step=1.5', '?step=999']) {
    instance.location.search = query;
    instance.listeners.popstate();
    tree = instance.render(Flow);
    assert.ok(elements(tree).some((node) => node.props?.onVerify));
  }
  instance.location.search = '?step=6';
  instance.listeners.popstate();
  tree = instance.render(Flow);
  const final = elements(tree).find((node) => node.props?.onRestart);
  assert.equal(final.props.fails, 0);
  assert.equal(final.props.seconds, 0);
});
