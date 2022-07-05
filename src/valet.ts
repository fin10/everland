import axios from 'axios';
import moment, { Moment } from 'moment';
import commander from 'commander';

const url = 'https://reservation.everland.com/web/comm.do';

type Capability = 'Unavailable' | 'Available' | 'Full';

const capability: ['Unavailable', 'Available', 'Full'] = ['Unavailable', 'Available', 'Full'];

interface ValetResponse {
  readonly result: {
    readonly cur_mon: string;
    readonly calList: {
      readonly capaFg: number;
      readonly date: string;
    }[];
  };
}

interface Valet {
  readonly date: Moment;
  readonly capability: Capability;
}

function handleError(error: unknown) {
  if (axios.isAxiosError(error)) {
    console.error(
      [`[${error.code}] ${error.response?.data}`, error.stack && `Casued by ${error.stack}`].filter((v) => v).join('\n')
    );
  } else {
    console.error(`Unknown error: ${JSON.stringify(error)}`);
  }
}

async function fetchValets(date: Moment): Promise<Valet[]> {
  const data: Record<string, string> = {
    method: 'calendarWoS',
    param_mon: date.format('YYYYMM'),
    s_top_menu_id: '02',
    chkMenuId: '02040100000000000001',
  };

  const response = await axios.post<ValetResponse>(
    url,
    Object.keys(data)
      .map((key) => `${key}=${data[key]}`)
      .join('&')
  );
  const { result } = response.data;

  return result.calList
    .filter((cal) => cal.date.length > 0)
    .filter((cal) => capability[cal.capaFg] !== 'Unavailable')
    .map((cal) => ({
      date: moment(`${result.cur_mon}${cal.date}`, 'YYYYMMDD'),
      capability: capability[cal.capaFg],
    }));
}

async function fetchValet(date: Moment): Promise<Valet | undefined> {
  return (await fetchValets(date)).find((valet) => valet.date.isSame(date, 'day'));
}

commander.program.option('--date <date>');

commander.program.parse();

const options = commander.program.opts();

const date = moment(options.date, 'YYYY-MM-DD');
if (!date || !date.isValid()) throw new Error(`Invalid date: ${options.date}`);

(async () => {
  try {
    const valet = await fetchValet(date);
    if (valet) {
      console.log(
        JSON.stringify(
          {
            date: valet.date.format('YYYY-MM-DD'),
            capability: valet.capability,
          },
          null,
          2
        )
      );
    }
  } catch (error) {
    handleError(error);
  }
})();
