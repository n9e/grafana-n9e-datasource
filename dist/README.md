# Grafana-n9e-datasource

Emm, nothing to say, it is better to install and use it.

## Dependencies

Grafana >= 7.x.x

## Installation
```BASH
grafana-cli --pluginUrl https://github.com/n9e/grafana-n9e-datasource/archive/v1.0.1.zip plugins install grafana-n9e-datasource
```

## Configuration

Add field `tokens` in monapi.yml and use this token as API Key when config n9e datasource.

```
tokens:
  - xxxxx
```

Add location in nginx.conf

```
location /v1/portal {
    proxy_pass http://n9e.monapi;
}
```

![image](https://user-images.githubusercontent.com/7424634/83121099-78fcdc80-a104-11ea-8b95-4935bde6b7dd.png)

## Getting started
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
