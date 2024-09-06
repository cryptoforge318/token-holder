import { PairCreated } from "../generated/uniswap-factory/UniswapV2Factory";
import { TokenTemplate } from "../generated/templates";
import { TokenPair } from "../generated/schema";

export function handlePairCreated(event: PairCreated): void {
  let pairAddress = event.params.pair;
  let token0 = event.params.token0;
  let token1 = event.params.token1;

  // Create a new TokenPair entity for the newly created pair
  let tokenPair = new TokenPair(pairAddress.toHex());
  tokenPair.token0 = token0;
  tokenPair.token1 = token1;
  tokenPair.pairAddress = pairAddress;
  tokenPair.save();

  // Instantiate the token template for tracking token0 and token1 transfers
  TokenTemplate.create(token0);
  TokenTemplate.create(token1);
}
