// src/worker/ai/places.ts
// AI-2 (reduced): stops seeded in prompt, no Vectorize needed at this scale.

export const SEEDED_STOPS = `
Available stops in Sri Lanka (use these names exactly):
Colombo Fort (කොටුව) | lat 6.9344 lng 79.8500
Kollupitiya (කොල්ලුපිටිය) | lat 6.9110 lng 79.8490
Bambalapitiya (බම්බලපිටිය) | lat 6.8940 lng 79.8560
Dehiwala (දෙහිවල) | lat 6.8510 lng 79.8650
Moratuwa (මොරටුව) | lat 6.7730 lng 79.8820
Kadawatha (කඩවත) | lat 7.0000 lng 79.9500
Ja-Ela (ජා-ඇල) | lat 7.0740 lng 79.8920
Negombo (මීගමුව) | lat 7.2080 lng 79.8380
Galle (ගාල්ල) | lat 6.0329 lng 80.2170
Matara (මාතර) | lat 5.9490 lng 80.5350
Ambalangoda (අම්බලන්ගොඩ) | lat 6.2350 lng 80.0540
Hikkaduwa (හික්කඩුව) | lat 6.1400 lng 80.1000
`.trim();
