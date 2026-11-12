"use client";

import { defineStep, type StepProps } from "@/captcha/types";
import SoundCaptcha from "./hear/SoundCaptcha";

export default defineStep({
  sense: "Hear",
  title: "Prove you can make noise",
  instructions: "Three rounds. You will need a microphone, and some dignity to lose.",
  Component: Hear,
});

function Hear({ pass, fail }: StepProps) {
  return <SoundCaptcha onSuccess={pass} onFail={() => fail("")} />;
}
