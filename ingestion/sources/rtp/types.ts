import type { TelevisionProgrammeItem } from "../television/types";
export type RtpProgrammeItem = TelevisionProgrammeItem & { broadcasterKey: "rtp" };
