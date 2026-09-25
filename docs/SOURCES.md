# Sources

Both files were downloaded on 25 September 2026 and are committed as
downloaded.

| File | Publisher and title | SHA-256 |
|---|---|---|
| `ons_affordability_workplace.xlsx` | ONS, *House price to workplace-based earnings ratio*, 2025 edition (aff1ratioofhousepricetoworkplacebasedearnings.xlsx): median and lower-quartile house prices, earnings and their ratios, England and Wales, its regions, counties and local authorities, 1997 to 2025 | `585bc98112e801fc3dd45dbc5238d05c6507d4e48dc3ec3afab4867eded1c2f4` |
| `boe_iumwtfa.csv` | Bank of England, series IUMWTFA: monthly interest rate of UK monetary financial institutions (excluding the central bank) sterling one-year fixed-rate bond deposits including unconditional bonuses from households, per cent, not seasonally adjusted, January 1996 to August 2026 | `faf27a9757414b55e5256523e4337204b642b6732cd4849f089a13edeed08e78` |

Addresses:

- ONS workbook: https://www.ons.gov.uk/peoplepopulationandcommunity/housing/datasets/ratioofhousepricetoworkplacebasedearningslowerquartileandmedian
  (file: `/file?uri=/peoplepopulationandcommunity/housing/datasets/ratioofhousepricetoworkplacebasedearningslowerquartileandmedian/current/aff1ratioofhousepricetoworkplacebasedearnings.xlsx`)
- Bank of England series: https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jan/1996&Dateto=30/Sep/2026&SeriesCodes=IUMWTFA&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N

## What the workbook holds

Tables 1 to 6: price (a), earnings (b) and ratio (c), for countries and
regions (1, 2), counties (3, 4) and local authorities (5, 6), median (1, 3, 5)
and lower quartile (2, 4, 6). House prices are for sales in the year to
September, from the ONS's House Price Statistics for Small Areas; earnings are
full-time gross annual earnings of people working in the area, from the
Annual Survey of Hours and Earnings for April of the same year. Every year is
on the local authority boundaries of 2025.

## Traps, and what was done about them

- **Half-up rounding.** The ONS rounds ratios half up; Python's `round` on
  floats does not reliably. The check divides in exact decimals.
- **Suppressed figures.** 337 ratios are "[x]", mostly in early years for
  small areas. They are counted and left out; a chase that would need one has
  no answer.
- **A column that is not a year.** Each ratio table ends with a five-year
  average, which the loader skips.
- **Year labels differ.** Price columns say "Year ending Sep 1997", earnings
  columns "1997"; both are the same year.
- **Guessed series codes.** I found the Bank of England series by trying
  codes. Of the four whose descriptions I looked up, three were mortgage or
  lending rates. The one used here was checked against the Bank's own
  description before anything was built on it.

## Also read, not used

- English Housing Survey live table FA2321, *sources of finance, other than a
  mortgage, for purchase of current property*: it covers every owner-occupier
  who bought their home, not recent first-time buyers, so it cannot say how
  many first-time buyers have family help. See the README.

## Licences

ONS data: Open Government Licence v3.0. Bank of England statistics: reused
under the Bank's terms, with attribution.
