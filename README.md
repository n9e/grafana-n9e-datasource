# Grafana-n9e-datasource

Emm, nothing to say, it is better to install and use it.

<img height="300" src="https://user-images.githubusercontent.com/7424634/83121099-78fcdc80-a104-11ea-8b95-4935bde6b7dd.png" />

## Dependencies

Grafana >= 7.x.x  
Nightingale >= V2.4.1

## Installation
```BASH
grafana-cli --pluginUrl https://github.com/n9e/grafana-n9e-datasource/archive/v1.5.1.zip plugins install grafana-n9e-datasource
```

## Configuration

### monapi

Add field `tokens` in `rdb.yml` and use this token when config n9e datasource.

```
tokens:
  - xxxxx
```

### grafana

Create datasource.

```
URL: nginx address
Token: the token u just created in rdb.yml
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

## Learn more
- [Build a data source plugin tutorial](https://grafana.com/tutorials/build-a-data-source-plugin)
- [Grafana documentation](https://grafana.com/docs/)
- [Grafana Tutorials](https://grafana.com/tutorials/) - Grafana Tutorials are step-by-step guides that help you make the most of Grafana
- [Grafana UI Library](https://developers.grafana.com/ui) - UI components to help you build interfaces using Grafana Design System
