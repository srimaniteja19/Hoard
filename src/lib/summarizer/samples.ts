export interface SampleSource {
  id: string;
  title: string;
  category: string;
  badge: string;
  preview: string;
  text: string;
}

export const SAMPLES: SampleSource[] = [
  {
    id: "black-scholes",
    title: "The 146-Year Relay to Black-Scholes",
    category: "MATHEMATICAL FINANCE & HISTORY",
    badge: "146-YEAR RELAY",
    preview: "How Bachelier, Samuelson, Black, Scholes, and Merton proved you never need to predict stock direction to price risk.",
    text: `In 1827, Scottish botanist Robert Brown looked through a microscope at pollen grains suspended in water and observed a jittery, ceaseless motion. He had no mathematical explanation, but he cataloged the physical phenomenon now called Brownian motion.

Seventy-three years later, in 1900 at the University of Paris, a French doctoral student named Louis Bachelier completed his thesis, Théorie de la Spéculation. Bachelier made an audacious leap: he applied the mathematics of Brownian motion to financial markets, proposing that stock price fluctuations follow a continuous random walk. His dissertation was graded "honorable" rather than the highest "très honorable," and his work was largely forgotten in the archives for over half a century.

In 1954, statistician Leonard Jimmie Savage stumbled upon Bachelier's obscure booklet in the library of the University of Chicago and sent postcards to several colleagues, including economist Paul Samuelson at MIT. Samuelson immediately recognized the genius of Bachelier's insight, but identified a fatal flaw: Bachelier's arithmetic Brownian motion allowed stock prices to become negative. Samuelson remedied this by developing geometric Brownian motion in 1965, ensuring prices stayed positive while returns remained normally distributed.

Yet, a fundamental impasse remained: any attempt to value a stock option seemed to require estimating the expected future return of the underlying stock—an inherently subjective, volatile parameter that nobody could measure with precision.

Enter Fischer Black and Myron Scholes in the late 1960s. Working in Cambridge, Massachusetts, Black and Scholes struggled for two years to resolve this parameter problem. In 1969, while collaborating with Robert C. Merton, they stumbled upon the central breakthrough: dynamic delta hedging.

If you construct a portfolio containing the stock and continuously sell just the right amount of call options against it, the price risk of the stock is exactly cancelled out by the option's value shift. Because this hedged portfolio is instantaneous risk-free, it must earn exactly the risk-free interest rate (such as Treasury bills).

The expected future trajectory of the stock drops completely out of the partial differential equation. The breakthrough wasn't predicting where a stock goes; it was proving you never needed to know.

Black and Scholes submitted their paper to the Journal of Political Economy and the Review of Economics and Statistics. Both journals rejected it without review. Only after Eugene Fama and Merton Miller intervened did the Journal of Political Economy publish "The Pricing of Options and Corporate Liabilities" in May 1973. In 1997, Scholes and Merton were awarded the Nobel Memorial Prize in Economic Sciences (Black had passed away in 1995).

In the 50 years since 1973, the global derivatives market grew from zero standardized contracts to over $600 trillion in notional value. Every automated market maker, sovereign debt hedge, and equity volatility desk on Earth traces its mathematical spine back through Merton, Black, Scholes, Samuelson, Bachelier, and Robert Brown's pollen grains.`,
  },
  {
    id: "transformer-architecture",
    title: "Attention Is All You Need & The Transformer Engine",
    category: "DEEP LEARNING & AI ARCHITECTURE",
    badge: "ANATOMY & CONTRAST",
    preview: "Why eliminating recurrence unlocked massive parallelization and transformed sequence modeling into quadratic matrix multiplications.",
    text: `Before 2017, sequence-to-sequence modeling in natural language processing was dominated by Recurrent Neural Networks (RNNs) and Long Short-Term Memory (LSTM) networks. While effective for short sequences, recurrent architectures suffered from a fundamental computational bottleneck: sequential execution.

In an RNN, the hidden state h_t at time step t strictly depends on the previous hidden state h_{t-1}. This serial dependency precludes parallelization across training tokens on modern GPU tensor cores. If a paragraph has 500 tokens, the model must execute 500 sequential forward passes. Moreover, gradients propagating backward through deep recurrent chains suffer from vanishing and exploding gradient phenomena, causing the model to forget distant context beyond 50 to 100 tokens.

In June 2017, a team of eight researchers at Google Brain and Google Research (Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, and Polosukhin) published "Attention Is All You Need." Their proposal was radical: discard recurrence entirely and rely solely on self-attention mechanisms.

The Transformer architecture is decomposed into three foundational subsystems:

1. Multi-Head Scaled Dot-Product Attention: Instead of passing a state token-by-token, the entire sequence is projected into three distinct dense matrices: Queries (Q), Keys (K), and Values (V). Attention scores are computed simultaneously across all token pairs via the formula Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V. This converts temporal reasoning into massive parallel matrix multiplications.

2. Positional Encodings: Because self-attention operates over sets with no inherent order, the model injects deterministic sinusoidal or learned positional vectors directly into the input embeddings to preserve word order.

3. Pointwise Feed-Forward Networks & Residual Normalization: Each attention layer is paired with an independent 2-layer MLP and wrapped in residual connections with LayerNorm, preventing degradation across 32, 64, or 128 stacked transformer blocks.

The computational contrast is stark. Traditional RNNs have an operational sequential path length of O(n) and cannot parallelize training. Transformers reduce the maximum path length between any two tokens in a sequence to O(1), enabling full GPU utilization at the cost of O(n^2) computational complexity with respect to context length n.

This architectural shift unlocked modern large language models, from BERT and GPT-3 to Gemini and Claude, proving that scale and compute efficiency matter far more than recurrent temporal inductive biases.`,
  },
  {
    id: "euv-lithography",
    title: "Extreme Ultraviolet Lithography & The Monopolistic Precision of ASML",
    category: "SEMICONDUCTOR PHYSICS & GEOPOLITICS",
    badge: "FLOW & SCALE",
    preview: "How bouncing 50,000 molten tin droplets a second at 200,000°C creates the 13.5nm light that powers every modern processor.",
    text: `Every modern smartphone, data center GPU, and advanced semiconductor fabricated at 3-nanometer and 2-nanometer nodes exists because of a single machine built by a single company in Veldhoven, Netherlands: the Twinscan EXE EUV scanner manufactured by ASML.

For four decades, photolithography relied on deep ultraviolet (DUV) light sources with a wavelength of 193 nanometers. Through immersion lithography (passing light through ultrapure water) and multiple patterning (splitting a circuit layer across four distinct exposures), engineers pushed 193nm light to print features down to 7 nanometers. Beyond that threshold, diffraction limits made further scaling physically impossible.

The solution was Extreme Ultraviolet (EUV) light at a wavelength of 13.5 nanometers—over fourteen times shorter than DUV. But generating and focusing 13.5nm photons is one of the most extreme engineering challenges in human history.

At 13.5nm, light is absorbed by almost all matter, including ambient air and pure optical glass. No conventional lenses can refract it. An EUV machine must operate in a high-vacuum chamber and use specialized Bragg reflection mirrors manufactured by Carl Zeiss. These mirrors consist of alternating atomic layers of molybdenum and silicon polished to an accuracy where the largest surface irregularity is less than the diameter of a single atom. If a Zeiss mirror were the size of Germany, the highest bump on its surface would be less than one millimeter tall.

Generating the EUV light itself requires an apocalyptic physical process developed by Cymer in San Diego:
1. A generator fires 50,000 microscopic droplets of molten tin per second through a vacuum chamber at a speed of 70 meters per second.
2. A high-power industrial CO2 laser pulses twice at each falling tin droplet. The first laser pulse flattens the droplet into a microscopic pancake.
3. The second laser pulse vaporizes the tin pancake into a plasma reaching 200,000 degrees Celsius—forty times hotter than the surface of the Sun.
4. The superheated tin plasma emits 13.5nm EUV photons, which are captured by an ellipsoidal collector mirror and channeled into the scanner.

An ASML EUV scanner weighs 180 metric tons, contains over 100,000 precision parts, costs $380 million, and requires three Boeing 747 cargo planes to transport. The entire global semiconductor supply chain—TSMC, Intel, Samsung, Nvidia, and Apple—hinges on this single feedback pipeline operating without a fraction of a nanometer of drift.`,
  },
  {
    id: "podcast-transcript",
    title: "Venture Capital & Hardware Startups (Podcast Transcript)",
    category: "TRANSCRIPT & REAL-TIME SPEECH",
    badge: "TRANSCRIPT FORMAT",
    preview: "Raw interview with timestamps, conversational filler, host sponsor reads, and core insights on tooling capital expenditure.",
    text: `[00:00] Host: Welcome back to The Deep Tech Wire. Today's episode is brought to you by CloudScale Database. If you want zero latency Postgres, check out the link in the show notes for 20% off your first year.

[00:24] Host: Today I'm joined by Sarah Chen, founding partner at Apex Capital. Sarah, thanks for coming on.

[00:30] Sarah Chen: Great to be here, thanks for having me.

[00:34] Host: So let's dive right into the hard question. In 2021, everyone said software is eating the world. Now in 2026, we're seeing massive valuations in robotics, energy, and physical infrastructure. Why did hardware suddenly become venture-backable again?

[01:02] Sarah Chen: Look, the conventional wisdom for fifteen years was "hardware is hard, don't touch it." And that was true when a tooling mold in Shenzhen cost $500,000 and took six months to iterate.

[01:28] Sarah Chen: What changed isn't software vs hardware; it's rapid simulation and localized additive manufacturing. Today, an aerospace or robotics founder can simulate fluid dynamics and thermal dissipation in Isaac Sim in 40 minutes for $12 of GPU compute.

[02:05] Host: Right, so you're killing the cycle time.

[02:10] Sarah Chen: Exactly. The unit economics of a hardware prototype used to look like a staircase of $2 million capital expenditure cliffs. Now the first three prototype revisions are essentially software simulations with 3D printed PEEK components. The capital required to reach physical proof-of-concept dropped from $15 million to under $800,000.

[02:50] Host: That's a 94% reduction in pre-seed burn.

[02:55] Sarah Chen: Precisely. But here is where founders trip up. They think lowering prototyping costs means manufacturing at scale is solved. The chasm isn't building unit #1; the chasm is building unit #10,000 with sub-1% defective scrap rates.

[03:30] Host: Let's talk about scrap rates. Before we do, a quick shoutout to our second sponsor, DevTools Weekly...

[03:52] Host: Okay, back to scrap rates. What separates the winners?

[04:00] Sarah Chen: The winners design for automated optical inspection on day one. If your chassis requires a human technician to hand-align a ribbon cable under a microscope, you have a science project, not a manufacturing business.`,
  },
];
