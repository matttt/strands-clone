"use client";

import Image from "next/image";
import { useMeasure } from "@uidotdev/usehooks";
import {isMobile} from 'react-device-detect'
import { Game } from './game';


export default function Home() {
  const [ref, { width, height }] = useMeasure();

  const sideLength = Math.min(width||0, height||0) * (isMobile ? 1.1 : .6);

  return (
    <main ref={ref} className="flex min-h-screen flex-col items-center justify-between p-5">
      <div className="grow"></div>
      <Game sideLength={sideLength} />
      <div className="grow"></div>
    </main>
  );
}
