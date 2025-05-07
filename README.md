# Design Token Transformer
Related Confluence article here: https://unbounce.atlassian.net/wiki/x/A4Dt1g
## Installation
### 1. Download or clone the repo to your computer

``` Bash
git clone https://github.com/unbounce/design-token-transformer.git
```
### 2. Install dependencies
1. From within the terminal, `cd` (navigate) to this folder.
2. Run `npm i` to install the dependencies.

## Usage
To use an exported JSON file and transform it locally on your machine, follow the 3 steps below:

1. Save the `.json` file you exported using the [Design Token](https://github.com/lukasoppermann/design-tokens) plugin to the [`tokens` folder](./tokens/) (and remove the example files).
2. In the terminal `cd` (navigate) to this folder.
3. Run `npm run transform-tokens`.
4. 🎉 Your converted tokens should be in the build folder.
