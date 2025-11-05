import { createDebouncer } from 'lib0/eventloop';

const CALLBACK_DEBOUNCE_WAIT = Number.parseInt(process.env.CALLBACK_DEBOUNCE_WAIT || '2000', 10);
const CALLBACK_DEBOUNCE_MAXWAIT = Number.parseInt(process.env.CALLBACK_DEBOUNCE_MAXWAIT || '10000', 10);

export const debouncer = createDebouncer(CALLBACK_DEBOUNCE_WAIT, CALLBACK_DEBOUNCE_MAXWAIT);
