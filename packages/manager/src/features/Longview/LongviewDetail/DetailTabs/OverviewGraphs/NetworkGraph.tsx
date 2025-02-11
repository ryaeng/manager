import { WithTheme, withTheme } from '@mui/styles';
import { pathOr } from 'ramda';
import * as React from 'react';
import { compose } from 'recompose';

import { LongviewLineGraph } from 'src/components/LongviewLineGraph/LongviewLineGraph';
import {
  formatNetworkTooltip,
  getMaxUnitAndFormatNetwork,
  sumNetwork,
} from 'src/features/Longview/shared/utilities';

import { convertData } from '../../../shared/formatters';
import { GraphProps } from './types';
import { useGraphs } from './useGraphs';

export type CombinedProps = GraphProps & WithTheme;

export const NetworkGraph: React.FC<CombinedProps> = (props) => {
  const {
    clientAPIKey,
    end,
    isToday,
    lastUpdated,
    lastUpdatedError,
    start,
    theme,
    timezone,
  } = props;

  const { data, error, loading, request } = useGraphs(
    ['network'],
    clientAPIKey,
    start,
    end
  );

  const networkData = React.useMemo(
    () => sumNetwork(pathOr({}, ['Interface'], data.Network)),
    [data.Network]
  );

  React.useEffect(() => {
    request();
  }, [start, end, clientAPIKey, lastUpdated, lastUpdatedError]);

  const _convertData = React.useCallback(convertData, [data, start, end]);

  const { rx_bytes, tx_bytes } = networkData;

  const { formatNetwork, maxUnit } = getMaxUnitAndFormatNetwork(
    rx_bytes,
    tx_bytes
  );

  return (
    <LongviewLineGraph
      data={[
        {
          backgroundColor: theme.graphs.network.inbound,
          borderColor: 'transparent',
          data: _convertData(rx_bytes, start, end),
          label: 'Inbound',
        },
        {
          backgroundColor: theme.graphs.network.outbound,
          borderColor: 'transparent',
          data: _convertData(tx_bytes, start, end),
          label: 'Outbound',
        },
      ]}
      ariaLabel="Network Usage Graph"
      error={error}
      formatData={formatNetwork}
      formatTooltip={formatNetworkTooltip}
      loading={loading}
      nativeLegend
      showToday={isToday}
      subtitle={maxUnit + '/s'}
      timezone={timezone}
      title="Network"
      unit={'/s'}
    />
  );
};

const enhanced = compose<CombinedProps, GraphProps>(React.memo, withTheme);

export default enhanced(NetworkGraph);
