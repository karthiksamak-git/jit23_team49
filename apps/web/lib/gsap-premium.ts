"use client";

/* ═══════════════════════════════════════════
   GSAP HEAVY PLUGINS — loaded on demand
   The full plugin set, but NOT registered at
   app load. Importing this module pulls it into
   its own chunk, so pages that never touch
   Draggable / MorphSVG / SplitText / Physics2D
   pay nothing for them.

   Usage inside a client component:

     import { loadGsapHeavy } from "@/lib/gsap-premium";
     import { gsap, useGSAP } from "@/lib/gsap";

     useGSAP(() => {
       loadGsapHeavy().then(({ SplitText }) => {
         // SplitText is registered now
       });
     });

   Core (gsap, useGSAP, ScrollTrigger) always comes
   from "@/lib/gsap" — that chunk stays tiny.
   ═══════════════════════════════════════════ */

import { gsap } from "gsap";

let loading: Promise<any> | null = null;

/**
 * Dynamically import + register the heavy plugin set once. Resolves with
 * the plugin map so callers can use them immediately. Safe to call many
 * times — the import is cached and registration is idempotent.
 */
export function loadGsapHeavy(): Promise<Record<string, any>> {
  if (loading) return loading;

  loading = (async () => {
    const [
      { CustomEase },
      { CustomBounce },
      { CustomWiggle },
      { RoughEase, ExpoScaleEase, SlowMo },
      { Draggable },
      { DrawSVGPlugin },
      { EaselPlugin },
      { Flip },
      { GSDevTools },
      { InertiaPlugin },
      { MotionPathHelper },
      { MotionPathPlugin },
      { MorphSVGPlugin },
      { Observer },
      { Physics2DPlugin },
      { PhysicsPropsPlugin },
      { PixiPlugin },
      { ScrambleTextPlugin },
      { ScrollSmoother },
      { ScrollToPlugin },
      { SplitText },
      { TextPlugin },
    ] = await Promise.all([
      import("gsap/CustomEase"),
      import("gsap/CustomBounce"),
      import("gsap/CustomWiggle"),
      import("gsap/EasePack"),
      import("gsap/Draggable"),
      import("gsap/DrawSVGPlugin"),
      import("gsap/EaselPlugin"),
      import("gsap/Flip"),
      import("gsap/GSDevTools"),
      import("gsap/InertiaPlugin"),
      import("gsap/MotionPathHelper"),
      import("gsap/MotionPathPlugin"),
      import("gsap/MorphSVGPlugin"),
      import("gsap/Observer"),
      import("gsap/Physics2DPlugin"),
      import("gsap/PhysicsPropsPlugin"),
      import("gsap/PixiPlugin"),
      import("gsap/ScrambleTextPlugin"),
      import("gsap/ScrollSmoother"),
      import("gsap/ScrollToPlugin"),
      import("gsap/SplitText"),
      import("gsap/TextPlugin"),
    ]);

    gsap.registerPlugin(
      CustomEase,
      CustomBounce,
      CustomWiggle,
      Draggable,
      DrawSVGPlugin,
      EaselPlugin,
      Flip,
      GSDevTools,
      InertiaPlugin,
      MotionPathHelper,
      MotionPathPlugin,
      MorphSVGPlugin,
      Observer,
      Physics2DPlugin,
      PhysicsPropsPlugin,
      PixiPlugin,
      ScrambleTextPlugin,
      ScrollSmoother,
      ScrollToPlugin,
      SplitText,
      TextPlugin
    );

    // EasePack members are eases, not plugins — expose but don't register.
    return {
      CustomEase,
      CustomBounce,
      CustomWiggle,
      RoughEase,
      ExpoScaleEase,
      SlowMo,
      Draggable,
      DrawSVGPlugin,
      EaselPlugin,
      Flip,
      GSDevTools,
      InertiaPlugin,
      MotionPathHelper,
      MotionPathPlugin,
      MorphSVGPlugin,
      Observer,
      Physics2DPlugin,
      PhysicsPropsPlugin,
      PixiPlugin,
      ScrambleTextPlugin,
      ScrollSmoother,
      ScrollToPlugin,
      SplitText,
      TextPlugin,
    };
  })();

  return loading;
}
