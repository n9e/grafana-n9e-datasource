import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms, InlineFormLabel } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps, onUpdateDatasourceJsonDataOptionSelect } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData } from './types';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions> {}

interface State {}

const { SecretFormField, FormField, Select } = LegacyForms;
const versions = [
  { label: 'v2', value: 'v2' },
  { label: 'v3', value: 'v3' },
];

export class ConfigEditor extends PureComponent<Props, State> {
  onPathChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      path: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  // Secure field (only sent to the backend)
  onAPIKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonData: {
        apiKey: event.target.value,
      },
    });
  };

  onResetAPIKey = () => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        apiKey: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        apiKey: '',
      },
    });
  };

  render() {
    const { options } = this.props;
    const { jsonData, secureJsonFields } = options;
    const secureJsonData = (options.secureJsonData || {}) as MySecureJsonData;

    return (
      <div className="gf-form-group">
        <div className="gf-form-inline">
          <div className="gf-form">
            <InlineFormLabel width={6}>Version</InlineFormLabel>
            <Select
              value={versions.find(version => version.value === jsonData.version) || versions[1]}
              options={versions}
              width={20}
              onChange={onUpdateDatasourceJsonDataOptionSelect(this.props, 'version')}
            />
          </div>
        </div>

        <div className="gf-form">
          <FormField
            label="URL"
            labelWidth={6}
            inputWidth={20}
            tooltip="nginx address, example: http://example.com"
            placeholder="http://example.com"
            value={jsonData.path || ''}
            onChange={this.onPathChange}
          />
        </div>

        <div className="gf-form-inline">
          <div className="gf-form">
            <SecretFormField
              label="Token"
              labelWidth={6}
              inputWidth={20}
              tooltip="field tokens in monapi.yml"
              placeholder="field tokens in monapi.yml"
              isConfigured={(secureJsonFields && secureJsonFields.apiKey) as boolean}
              value={secureJsonData.apiKey || ''}
              onReset={this.onResetAPIKey}
              onChange={this.onAPIKeyChange}
            />
          </div>
        </div>
      </div>
    );
  }
}
