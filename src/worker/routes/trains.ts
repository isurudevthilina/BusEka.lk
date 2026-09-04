// src/worker/routes/trains.ts
// Honest stub — Sri Lanka Railways has no live GPS feed.

import { Hono } from 'hono';

const trains = new Hono<{ Bindings: Env }>();

trains.get('/api/trains', (c) => {
  return c.json({
    note: 'Sri Lanka Railways does not publish live train positions. BusEka builds this from passenger GPS reports (crowdsourced). The ingest pipeline is not yet ready.',
    status: 'coming_soon',
    lines: [
      { id: 'coastal', name: 'Coastal Line (ගාලු පාර)', from: 'Colombo Fort', to: 'Matara' },
      { id: 'main', name: 'Main Line (මහනුවර)', from: 'Colombo Fort', to: 'Badulla' },
      { id: 'kelani', name: 'Kelani Valley Line', from: 'Colombo Fort', to: 'Avissawella' },
      { id: 'northern', name: 'Northern Line (යාල් දේවී)', from: 'Colombo Fort', to: 'Jaffna' },
      { id: 'puttalam', name: 'Puttalam Line', from: 'Colombo Fort', to: 'Puttalam' },
    ],
  });
});

export { trains };
