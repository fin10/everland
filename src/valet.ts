import axios from 'axios';
import moment, { Moment } from 'moment';

const url = 'https://reservation.everland.com/web/comm.do';

const enum Capability {
  Unavailable = '0',
  Available = '1',
  Full = '2',
}

interface ValetResponse {
  readonly result: {
    readonly cur_mon: string;
    readonly calList: {
      readonly capaFg: Capability;
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

async function fetchValets(): Promise<Valet[]> {
  const data: Record<string, string> = {
    method: 'calendarWoS',
    param_mon: '202208',
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
    .filter((cal) => cal.capaFg !== Capability.Unavailable)
    .map((cal) => ({
      date: moment(`${result.cur_mon}${cal.date}`, 'YYYYMMDD'),
      capability: cal.capaFg,
    }));
}

(async () => {
  try {
    const valets = await fetchValets();
    console.log(JSON.stringify(valets, null, 2));
  } catch (error) {
    handleError(error);
  }
})();
