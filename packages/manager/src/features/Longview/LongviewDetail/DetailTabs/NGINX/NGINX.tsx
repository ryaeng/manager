import { APIError } from '@linode/api-v4/lib/types';
import { Theme } from '@mui/material/styles';
import { makeStyles } from '@mui/styles';
import * as React from 'react';

import { Box } from 'src/components/Box';
import { DocumentTitleSegment } from 'src/components/DocumentTitle';
import { Grid } from 'src/components/Grid';
import { Link } from 'src/components/Link';
import { Notice } from 'src/components/Notice/Notice';
import { Typography } from 'src/components/Typography';
import { isToday as _isToday } from 'src/utilities/isToday';

import { WithStartAndEnd } from '../../../request.types';
import TimeRangeSelect from '../../../shared/TimeRangeSelect';
import { useGraphs } from '../OverviewGraphs/useGraphs';
import NGINXGraphs from './NGINXGraphs';

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    width: 250,
  },
  title: {
    [theme.breakpoints.down('lg')]: {
      marginLeft: theme.spacing(),
      marginRight: theme.spacing(),
    },
  },
}));

interface Props {
  clientAPIKey?: string;
  lastUpdated?: number;
  lastUpdatedError?: APIError[];
  timezone: string;
}

export const NGINX: React.FC<Props> = (props) => {
  const classes = useStyles();

  const { clientAPIKey, lastUpdated, lastUpdatedError, timezone } = props;

  const [version, setVersion] = React.useState<string | undefined>();
  const [time, setTimeBox] = React.useState<WithStartAndEnd>({
    end: 0,
    start: 0,
  });

  const { data, error, loading, request } = useGraphs(
    ['nginx'],
    clientAPIKey,
    time.start,
    time.end
  );

  /**
   * We request/store this data separately because:
   * 1. Classic does (in fact they do each set of fields individually)
   * 2. The request is huge otherwise
   * 3. A hybrid nginx/processes interface would be messy
   * 4. They are conceptually separate
   *
   * A downside to this approach is that the data in this view is essentially
   * in two halves, but this is not clear to the user. They might see, for example,
   * half the graphs in an error state and the others ok, which could be off-putting.
   */
  const nginxProcesses = useGraphs(
    ['nginxProcesses'],
    clientAPIKey,
    time.start,
    time.end
  );

  const _version = data.Applications?.Nginx?.version;
  if (!version && _version) {
    setVersion(_version);
  }

  React.useEffect(() => {
    request();
    nginxProcesses.request();
  }, [time, clientAPIKey, lastUpdated, lastUpdatedError]);

  const handleStatsChange = (start: number, end: number) => {
    setTimeBox({ end, start });
  };

  const nginx = data.Applications?.Nginx;
  const isToday = _isToday(time.start, time.end);
  const notice = Number(nginx?.status) > 0 ? nginx?.status_message : null;

  if (notice !== null) {
    return (
      <Notice warning>
        <Typography>{notice}</Typography>
        <Typography>
          See our{' '}
          <Link to="https://www.linode.com/docs/platform/longview/longview-app-for-nginx/#troubleshooting">
            guide
          </Link>{' '}
          for help troubleshooting the NGINX Longview app.
        </Typography>
      </Notice>
    );
  }

  return (
    <Grid container direction="column">
      <DocumentTitleSegment segment={'NGINX'} />
      <Grid item xs={12}>
        <Box
          alignItems="center"
          display="flex"
          flexDirection="row"
          justifyContent="space-between"
        >
          <div>
            <Typography className={classes.title} variant="h2">
              NGINX
            </Typography>
            {version && <Typography variant="body1">{version}</Typography>}
          </div>
          <TimeRangeSelect
            className={classes.root}
            defaultValue="Past 30 Minutes"
            handleStatsChange={handleStatsChange}
            hideLabel
            label="Select Time Range"
            small
          />
        </Box>
      </Grid>
      <Grid className="py0" item xs={12}>
        <NGINXGraphs
          data={data?.Applications?.Nginx}
          end={time.end}
          error={lastUpdatedError?.[0]?.reason || error}
          isToday={isToday}
          loading={loading}
          processesData={nginxProcesses.data?.Processes ?? {}}
          processesError={nginxProcesses.error}
          processesLoading={nginxProcesses.loading}
          start={time.start}
          timezone={timezone}
        />
      </Grid>
    </Grid>
  );
};

export default React.memo(NGINX);
