import { fetchSicProgramme } from "../sources/sic/fetcher";
import { fetchTviProgramme } from "../sources/tvi/fetcher";

async function main(): Promise<void> {
  const [sic, tvi] = await Promise.all([
    fetchSicProgramme({ now: () => new Date() }),
    fetchTviProgramme({ now: () => new Date() }),
  ]);

  console.log(
    JSON.stringify(
      {
        sic: {
          count: sic.length,
          channels: [...new Set(sic.map((item) => item.channel))],
          sample: sic.slice(0, 5).map((item) => ({
            title: item.title,
            channel: item.channel,
            startAt: item.startAt,
          })),
        },
        tvi: {
          count: tvi.length,
          channels: [...new Set(tvi.map((item) => item.channel))],
          sample: tvi.slice(0, 5).map((item) => ({
            title: item.title,
            channel: item.channel,
            startAt: item.startAt,
          })),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
