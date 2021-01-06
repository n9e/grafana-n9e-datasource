# Grafana-n9e-datasource

Emm, nothing to say, it is better to install and use it.

<img height="300" src="https://user-images.githubusercontent.com/7424634/83121099-78fcdc80-a104-11ea-8b95-4935bde6b7dd.png" />

## Dependencies

Grafana >= 7.x.x  
Nightingale >= V2.4.1

## Installation
```BASH
grafana-cli --pluginUrl https://github.com/n9e/grafana-n9e-datasource/archive/v1.5.3.zip plugins install grafana-n9e-datasource
```

## Configuration

### rdb

Generate a token on `/rdb/personnel-info/profile`.

### grafana

Create datasource.

```
URL: nginx address
Token: the token u just generated on /rdb/personnel-info/profile
```

### grafana variables

| Name | Type | Query(Query Options) | Multi-value(Selection Options) | Include All option(Selection Options) |  
| ---- | ---- | ---- | ------ | -- |  
| Node | Query | Node | off | off |  
| Endpoints | Query | Endpoints BY $Node | on | on |  

> Variable names and query value are fixed.

#### QueryEditor

<img width="200" src="https://user-images.githubusercontent.com/7424634/83507463-2bfd7980-a4fb-11ea-8331-4bcb5bb64267.png" />

## Development
1. Install dependencies
```BASH
yarn install
```
2. Build plugin in development mode or run in watch mode
```BASH
yarn dev
```
or
```BASH
yarn watch
```
3. Build plugin in production mode
```BASH
yarn build
```

## FAQ
- [无法看图问题排查](https://github.com/n9e/grafana-n9e-datasource/wiki/%E6%97%A0%E6%B3%95%E7%9C%8B%E5%9B%BE%E9%97%AE%E9%A2%98%E6%8E%92%E6%9F%A5)

## Learn more
- [Build a data source plugin tutorial](https://grafana.com/tutorials/build-a-data-source-plugin)
- [Grafana documentation](https://grafana.com/docs/)
- [Grafana Tutorials](https://grafana.com/tutorials/) - Grafana Tutorials are step-by-step guides that help you make the most of Grafana
- [Grafana UI Library](https://developers.grafana.com/ui) - UI components to help you build interfaces using Grafana Design System
