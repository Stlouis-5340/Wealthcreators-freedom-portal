export const passiveRules = {
  counts: [
    "Dividends, interest, and fund distributions",
    "Net rent after the real costs of the property",
    "Royalties and silent-partner income",
    "Lending yield",
    "Pension or annuity income when it is tagged passive",
  ],
  excluded: [
    "W-2 wages and active self-employment",
    "Selling assets or withdrawing principal",
    "Gifts, refunds, and reimbursements",
    "Draws from debt",
    "Transfers between your own accounts",
  ],
  later: [
    "Social Security — left configurable, excluded from this sample score",
    "DRIP reinvestment — treated here as asset growth, not income",
    "Semi-passive business income — left configurable, excluded until tagged",
  ],
};
