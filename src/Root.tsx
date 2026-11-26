import React from "react";
import {Composition} from "remotion";
import {Documentary} from "./Documentary";

export const RemotionRoot: React.FC = () => <Composition id="Documentary" component={Documentary} durationInFrames={450} fps={30} width={1920} height={1080} />;
