// TypeScript ne resout pas les suffixes .native/.web que Metro choisit au build.
// Ce fichier n'est lu que par tsc : Metro ignore les .d.ts.
export { StripeWrapper } from './StripeWrapper.native';
