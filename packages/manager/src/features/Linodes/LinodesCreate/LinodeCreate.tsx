import { InterfacePayload, restoreBackup } from '@linode/api-v4/lib/linodes';
import { Tag } from '@linode/api-v4/lib/tags/types';
import Grid from '@mui/material/Unstable_Grid2';
import cloneDeep from 'lodash/cloneDeep';
import * as React from 'react';
import { MapDispatchToProps, connect } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import { compose as recompose } from 'recompose';
import { v4 } from 'uuid';

import AccessPanel from 'src/components/AccessPanel/AccessPanel';
import { Box } from 'src/components/Box';
import { CheckoutSummary } from 'src/components/CheckoutSummary/CheckoutSummary';
import { CircleProgress } from 'src/components/CircleProgress';
import { DocsLink } from 'src/components/DocsLink/DocsLink';
import { ErrorState } from 'src/components/ErrorState/ErrorState';
import { LabelAndTagsPanel } from 'src/components/LabelAndTagsPanel/LabelAndTagsPanel';
import { Notice } from 'src/components/Notice/Notice';
import { TabPanels } from 'src/components/ReachTabPanels';
import { Tabs } from 'src/components/ReachTabs';
import { SafeTabPanel } from 'src/components/SafeTabPanel/SafeTabPanel';
import { SelectRegionPanel } from 'src/components/SelectRegionPanel/SelectRegionPanel';
import { TabLinkList } from 'src/components/TabLinkList/TabLinkList';
import { Typography } from 'src/components/Typography';
import { DefaultProps as ImagesProps } from 'src/containers/images.container';
import { RegionsProps } from 'src/containers/regions.container';
import { WithTypesProps } from 'src/containers/types.container';
import { FeatureFlagConsumerProps } from 'src/containers/withFeatureFlagConsumer.container';
import { WithLinodesProps } from 'src/containers/withLinodes.container';
import EUAgreementCheckbox from 'src/features/Account/Agreements/EUAgreementCheckbox';
import {
  getMonthlyAndHourlyNodePricing,
  utoa,
} from 'src/features/Linodes/LinodesCreate/utilities';
import { SMTPRestrictionText } from 'src/features/Linodes/SMTPRestrictionText';
import {
  getCommunityStackscripts,
  getMineAndAccountStackScripts,
} from 'src/features/StackScripts/stackScriptUtils';
import { PlansPanel } from 'src/features/components/PlansPanel/PlansPanel';
import {
  CreateTypes,
  handleChangeCreateType,
} from 'src/store/linodeCreate/linodeCreate.actions';
import { getInitialType } from 'src/store/linodeCreate/linodeCreate.reducer';
import {
  sendApiAwarenessClickEvent,
  sendLinodeCreateFlowDocsClickEvent,
} from 'src/utilities/analytics';
import { doesRegionSupportFeature } from 'src/utilities/doesRegionSupportFeature';
import { getErrorMap } from 'src/utilities/errorUtils';
import { extendType } from 'src/utilities/extendType';
import { filterCurrentTypes } from 'src/utilities/filterCurrentLinodeTypes';
import { getQueryParamsFromQueryString } from 'src/utilities/queryParams';

import { AddonsPanel } from './AddonsPanel';
import { ApiAwarenessModal } from './ApiAwarenessModal/ApiAwarenessModal';
import {
  StyledButtonGroupBox,
  StyledCreateButton,
  StyledForm,
  StyledMessageDiv,
  StyledPaper,
  StyledTabPanel,
} from './LinodeCreate.styles';
import { FromAppsContent } from './TabbedContent/FromAppsContent';
import { FromBackupsContent } from './TabbedContent/FromBackupsContent';
import { FromImageContent } from './TabbedContent/FromImageContent';
import { FromLinodeContent } from './TabbedContent/FromLinodeContent';
import { FromStackScriptContent } from './TabbedContent/FromStackScriptContent';
import { renderBackupsDisplaySection } from './TabbedContent/utils';
import {
  AllFormStateAndHandlers,
  AppsData,
  HandleSubmit,
  Info,
  LinodeCreateValidation,
  ReduxStateProps,
  StackScriptFormStateHandlers,
  TypeInfo,
  WithDisplayData,
  WithTypesRegionsAndImages,
} from './types';

import type { Tab } from 'src/components/TabLinkList/TabLinkList';

export interface LinodeCreateProps {
  backupsMonthlyPrice?: null | number;
  checkValidation: LinodeCreateValidation;
  createType: CreateTypes;
  handleAgreementChange: () => void;
  handleShowApiAwarenessModal: () => void;
  handleSubmitForm: HandleSubmit;
  handleVLANChange: (updatedInterface: InterfacePayload) => void;
  history: any;
  imageDisplayInfo: Info;
  ipamAddress: null | string;
  label: string;
  regionDisplayInfo: Info;
  resetCreationState: () => void;
  setAuthorizedUsers: (usernames: string[]) => void;
  setBackupID: (id: number) => void;
  showAgreement: boolean;
  showApiAwarenessModal: boolean;
  showGeneralError?: boolean;
  signedAgreement: boolean;
  toggleBackupsEnabled: () => void;
  togglePrivateIPEnabled: () => void;
  typeDisplayInfo: TypeInfo;
  updateDiskSize: (size: number) => void;
  updateLabel: (label: string) => void;
  updateLinodeID: (id: number, diskSize?: number | undefined) => void;
  updatePassword: (password: string) => void;
  updateTags: (tags: Tag[]) => void;
  updateUserData: (userData: string) => void;
  userData: string | undefined;
  vlanLabel: null | string;
}

const errorMap = [
  'backup_id',
  'image',
  'label',
  'linode_id',
  'region',
  'root_pass',
  'stackscript_id',
  'type',
  'interfaces[1].label',
  'interfaces[1].ipam_address',
];

type InnerProps = WithTypesRegionsAndImages &
  ReduxStateProps &
  StackScriptFormStateHandlers &
  LinodeCreateProps;

type CombinedProps = InnerProps &
  AllFormStateAndHandlers &
  AppsData &
  ReduxStateProps &
  WithDisplayData &
  ImagesProps &
  WithLinodesProps &
  RegionsProps &
  WithTypesProps &
  RouteComponentProps<{}> &
  FeatureFlagConsumerProps;

interface State {
  numberOfNodes: number;
  planKey: string;
  selectedTab: number;
  stackScriptSelectedTab: number;
}

interface CreateTab extends Tab {
  type: CreateTypes;
}

export class LinodeCreate extends React.PureComponent<
  CombinedProps & DispatchProps,
  State
> {
  constructor(props: CombinedProps & DispatchProps) {
    super(props);

    /** Get the query params as an object, excluding the "?" */
    const queryParams = getQueryParamsFromQueryString(location.search);

    const _tabs = [
      'Distributions',
      'One-Click',
      'StackScripts',
      'Images',
      'Backups',
      'Clone Linode',
    ];

    /** Will be -1 if the query param is not found */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const preSelectedTab = _tabs.findIndex((eachTab, index) => {
      return eachTab === queryParams.type;
    });

    // If there is no specified "type" in the query params, update the Redux state
    // so that the correct request is made when the form is submitted.
    if (!queryParams.type) {
      this.props.setTab(this.tabs[0].type);
    }

    this.state = {
      numberOfNodes: 0,
      planKey: v4(),
      selectedTab: preSelectedTab !== -1 ? preSelectedTab : 0,
      stackScriptSelectedTab:
        preSelectedTab === 2 && location.search.search('Community') > -1
          ? 1
          : 0,
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.props.setTab(getInitialType());
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  render() {
    const { selectedTab, stackScriptSelectedTab } = this.state;

    const {
      accountBackupsEnabled,
      backupsMonthlyPrice,
      errors,
      formIsSubmitting,
      handleAgreementChange,
      handleShowApiAwarenessModal,
      imageDisplayInfo,
      imagesData,
      imagesError,
      imagesLoading,
      label,
      linodesData,
      linodesError,
      linodesLoading,
      regionDisplayInfo,
      regionsData,
      regionsError,
      regionsLoading,
      selectedRegionID,
      showAgreement,
      showApiAwarenessModal,
      showGeneralError,
      signedAgreement,
      tags,
      typeDisplayInfo,
      typesData,
      typesError,
      typesLoading,
      updateLabel,
      updateTags,
      updateUserData,
      userCannotCreateLinode,
      ...rest
    } = this.props;

    const hasErrorFor = getErrorMap(errorMap, errors);

    const generalError = getErrorMap(errorMap, errors).none;

    if (regionsLoading || imagesLoading || linodesLoading || typesLoading) {
      return <CircleProgress />;
    }

    if (regionsError || imagesError || linodesError || typesError) {
      return (
        <ErrorState errorText="There was an issue loading Linode creation options." />
      );
    }

    if (!linodesData || !imagesData || !regionsData || !typesData) {
      return null;
    }

    const tagsInputProps = {
      disabled: userCannotCreateLinode,
      onChange: updateTags,
      tagError: hasErrorFor.tags,
      value: tags || [],
    };

    const hasBackups = Boolean(
      this.props.backupsEnabled || accountBackupsEnabled
    );

    const displaySections = [];
    if (imageDisplayInfo) {
      displaySections.push(imageDisplayInfo);
    }

    if (regionDisplayInfo) {
      displaySections.push({
        details: regionDisplayInfo.details,
        title: regionDisplayInfo.title,
      });
    }

    if (typeDisplayInfo) {
      const typeDisplayInfoCopy = cloneDeep(typeDisplayInfo);

      if (this.props.createType === 'fromApp' && this.state.numberOfNodes > 0) {
        const { hourlyPrice, monthlyPrice } = getMonthlyAndHourlyNodePricing(
          typeDisplayInfoCopy.monthly,
          typeDisplayInfoCopy.hourly,
          this.state.numberOfNodes
        );

        typeDisplayInfoCopy.details = `${this.state.numberOfNodes} Nodes - $${monthlyPrice}/month $${hourlyPrice}/hr`;
      }

      displaySections.push(typeDisplayInfoCopy);
    }

    if (hasBackups && typeDisplayInfo && typeDisplayInfo.backupsMonthly) {
      displaySections.push(
        renderBackupsDisplaySection(
          accountBackupsEnabled,
          typeDisplayInfo.backupsMonthly
        )
      );
    }

    if (this.props.vlanLabel) {
      displaySections.push({
        title: 'VLAN Attached',
      });
    }

    if (this.props.privateIPEnabled) {
      displaySections.push({
        title: 'Private IP',
      });
    }

    const selectedLinode = this.props.linodesData?.find(
      (image) => image.id === this.props.selectedLinodeID
    );

    const imageIsCloudInitCompatible =
      this.props.selectedImageID &&
      this.props.imagesData[this.props.selectedImageID]?.capabilities?.includes(
        'cloud-init'
      );

    const linodeIsCloudInitCompatible =
      this.props.selectedLinodeID &&
      selectedLinode?.image &&
      this.props.imagesData[selectedLinode?.image]?.capabilities?.includes(
        'cloud-init'
      );

    const regionSupportsMetadata =
      this.props.regionsData
        .find((region) => region.id === this.props.selectedRegionID)
        ?.capabilities.includes('Metadata') ?? false;

    const showUserData =
      this.props.flags.metadata &&
      regionSupportsMetadata &&
      (imageIsCloudInitCompatible || linodeIsCloudInitCompatible);

    return (
      <StyledForm>
        <Grid className="py0">
          {hasErrorFor.none && !!showGeneralError && (
            <Notice error spacingTop={8} text={hasErrorFor.none} />
          )}
          {generalError && <Notice error spacingTop={8} text={generalError} />}
          {userCannotCreateLinode && (
            <Notice
              text={
                "You don't have permissions to create a new Linode. Please contact an account administrator for details."
              }
              error
              important
            />
          )}
          <Tabs defaultIndex={selectedTab} onChange={this.handleTabChange}>
            <TabLinkList tabs={this.tabs} />
            <TabPanels>
              <SafeTabPanel index={0}>
                <FromImageContent
                  accountBackupsEnabled={accountBackupsEnabled}
                  error={hasErrorFor.image}
                  imagePanelTitle="Choose a Distribution"
                  imagesData={imagesData!}
                  regionsData={regionsData!}
                  typesData={typesData!}
                  userCannotCreateLinode={userCannotCreateLinode}
                  variant="public"
                  {...rest}
                />
              </SafeTabPanel>
              <SafeTabPanel index={1}>
                <FromAppsContent
                  setNumberOfNodesForAppCluster={
                    this.setNumberOfNodesForAppCluster
                  }
                  // error={hasErrorFor.image}
                  accountBackupsEnabled={accountBackupsEnabled}
                  errors={errors}
                  imagesData={imagesData!}
                  regionsData={regionsData!}
                  typesData={typesData!}
                  userCannotCreateLinode={userCannotCreateLinode}
                  {...rest}
                />
              </SafeTabPanel>
              <SafeTabPanel index={2}>
                <Tabs defaultIndex={stackScriptSelectedTab}>
                  <StyledPaper>
                    <Typography variant="h2">Create From:</Typography>
                    <TabLinkList tabs={this.stackScriptTabs} />
                    <StyledTabPanel>
                      <SafeTabPanel index={0}>
                        <FromStackScriptContent
                          accountBackupsEnabled={accountBackupsEnabled}
                          category="account"
                          errors={errors}
                          header={'Select a StackScript'}
                          imagesData={imagesData!}
                          regionsData={regionsData!}
                          request={getMineAndAccountStackScripts}
                          typesData={typesData!}
                          userCannotCreateLinode={userCannotCreateLinode}
                          {...rest}
                        />
                      </SafeTabPanel>
                      <SafeTabPanel index={1}>
                        <FromStackScriptContent
                          accountBackupsEnabled={accountBackupsEnabled}
                          category="community"
                          errors={errors}
                          header={'Select a StackScript'}
                          imagesData={imagesData!}
                          regionsData={regionsData!}
                          request={getCommunityStackscripts}
                          typesData={typesData!}
                          userCannotCreateLinode={userCannotCreateLinode}
                          {...rest}
                        />
                      </SafeTabPanel>
                    </StyledTabPanel>
                  </StyledPaper>
                </Tabs>
              </SafeTabPanel>
              <SafeTabPanel index={3}>
                <FromImageContent
                  accountBackupsEnabled={accountBackupsEnabled}
                  imagePanelTitle="Choose an Image"
                  imagesData={imagesData}
                  regionsData={regionsData!}
                  typesData={typesData!}
                  userCannotCreateLinode={userCannotCreateLinode}
                  variant={'private'}
                  {...rest}
                />
              </SafeTabPanel>
              <SafeTabPanel index={4}>
                <FromBackupsContent
                  accountBackupsEnabled={accountBackupsEnabled}
                  errors={errors}
                  imagesData={imagesData!}
                  linodesData={linodesData!}
                  regionsData={regionsData!}
                  typesData={typesData!}
                  userCannotCreateLinode={userCannotCreateLinode}
                  {...restoreBackup}
                  {...rest}
                />
              </SafeTabPanel>
              <SafeTabPanel index={5}>
                <FromLinodeContent
                  accountBackupsEnabled={accountBackupsEnabled}
                  errors={errors}
                  imagesData={imagesData!}
                  linodesData={linodesData!}
                  regionsData={regionsData!}
                  typesData={typesData!}
                  userCannotCreateLinode={userCannotCreateLinode}
                  {...rest}
                />
              </SafeTabPanel>
            </TabPanels>
          </Tabs>

          {this.props.createType !== 'fromBackup' && (
            <SelectRegionPanel
              data-qa-select-region-panel
              disabled={userCannotCreateLinode}
              error={hasErrorFor.region}
              handleSelection={this.props.updateRegionID}
              helperText={this.props.regionHelperText}
              regions={regionsData!}
              selectedID={this.props.selectedRegionID}
              selectedLinodeTypeId={this.props.selectedTypeID}
            />
          )}
          <PlansPanel
            docsLink={
              <DocsLink
                onClick={() => {
                  sendLinodeCreateFlowDocsClickEvent('Choosing a Plan');
                }}
                href="https://www.linode.com/docs/guides/choosing-a-compute-instance-plan/"
                label="Choosing a Plan"
              />
            }
            data-qa-select-plan
            disabled={userCannotCreateLinode}
            disabledClasses={this.props.disabledClasses}
            error={hasErrorFor.type}
            isCreate
            key={this.state.planKey}
            linodeID={this.props.selectedLinodeID}
            onSelect={this.props.updateTypeID}
            regionsData={regionsData!}
            selectedID={this.props.selectedTypeID}
            selectedRegionID={selectedRegionID}
            showTransfer
            types={this.filterTypes()}
          />
          <LabelAndTagsPanel
            labelFieldProps={{
              disabled: userCannotCreateLinode,
              errorText: hasErrorFor.label,
              label: 'Linode Label',
              onChange: (e) => updateLabel(e.target.value),
              value: label || '',
            }}
            tagsInputProps={
              this.props.createType !== 'fromLinode'
                ? tagsInputProps
                : undefined
            }
            data-qa-label-and-tags-panel
          />
          {/* Hide for backups and clone */}
          {!['fromBackup', 'fromLinode'].includes(this.props.createType) && (
            <AccessPanel
              disabledReason={
                !this.props.selectedImageID
                  ? 'You must select an image to set a root password'
                  : ''
              }
              authorizedUsers={this.props.authorized_users}
              data-qa-access-panel
              disabled={!this.props.selectedImageID || userCannotCreateLinode}
              error={hasErrorFor.root_pass}
              handleChange={this.props.updatePassword}
              password={this.props.password}
              setAuthorizedUsers={this.props.setAuthorizedUsers}
            />
          )}
          <AddonsPanel
            userData={{
              createType: this.props.createType,
              onChange: updateUserData,
              showUserData: Boolean(showUserData),
              userData: this.props.userData,
            }}
            accountBackups={accountBackupsEnabled}
            backups={this.props.backupsEnabled}
            backupsMonthly={backupsMonthlyPrice}
            changeBackups={this.props.toggleBackupsEnabled}
            createType={this.props.createType}
            data-qa-addons-panel
            disabled={userCannotCreateLinode}
            handleVLANChange={this.props.handleVLANChange}
            ipamAddress={this.props.ipamAddress || ''}
            ipamError={hasErrorFor['interfaces[1].ipam_address']}
            isPrivateIPChecked={this.props.privateIPEnabled}
            labelError={hasErrorFor['interfaces[1].label']}
            linodesData={this.props.linodesData}
            selectedImageID={this.props.selectedImageID}
            selectedLinodeID={this.props.selectedLinodeID}
            selectedRegionID={this.props.selectedRegionID}
            selectedTypeID={this.props.selectedTypeID}
            togglePrivateIP={this.props.togglePrivateIPEnabled}
            vlanLabel={this.props.vlanLabel || ''}
          />
          <CheckoutSummary
            data-qa-checkout-bar
            displaySections={displaySections}
            heading={`Summary ${this.props.label}`}
          />
          <Box
            alignItems="center"
            display="flex"
            flexWrap="wrap"
            justifyContent={showAgreement ? 'space-between' : 'flex-end'}
          >
            <StyledMessageDiv showAgreement={!!showAgreement}>
              <SMTPRestrictionText>
                {({ text }) => <Grid xs={12}>{text}</Grid>}
              </SMTPRestrictionText>
              {showAgreement ? (
                <EUAgreementCheckbox
                  centerCheckbox
                  checked={signedAgreement}
                  onChange={handleAgreementChange}
                />
              ) : null}
            </StyledMessageDiv>
          </Box>
          <StyledButtonGroupBox
            alignItems="center"
            display="flex"
            justifyContent="flex-end"
          >
            <StyledCreateButton
              disabled={
                formIsSubmitting ||
                userCannotCreateLinode ||
                (showAgreement && !signedAgreement)
              }
              buttonType="outlined"
              data-qa-api-cli-linode
              onClick={this.handleClickCreateUsingCommandLine}
            >
              Create using command line
            </StyledCreateButton>
            <StyledCreateButton
              disabled={
                formIsSubmitting ||
                userCannotCreateLinode ||
                (showAgreement && !signedAgreement)
              }
              buttonType="primary"
              data-qa-deploy-linode
              loading={formIsSubmitting}
              onClick={this.createLinode}
            >
              Create Linode
            </StyledCreateButton>
            <ApiAwarenessModal
              isOpen={showApiAwarenessModal}
              onClose={handleShowApiAwarenessModal}
              payLoad={this.getPayload()}
              route={this.props.match.url}
            />
          </StyledButtonGroupBox>
        </Grid>
      </StyledForm>
    );
  }

  createLinode = () => {
    const payload = this.getPayload();
    this.props.handleSubmitForm(payload, this.props.selectedLinodeID);
  };

  filterTypes = () => {
    const { createType, typesData } = this.props;
    const { selectedTab } = this.state;
    const currentTypes = filterCurrentTypes(typesData?.map(extendType));

    return ['fromBackup', 'fromImage'].includes(createType) && selectedTab !== 0
      ? currentTypes.filter((t) => t.class !== 'metal')
      : currentTypes;
  };

  getPayload = () => {
    const selectedRegion = this.props.selectedRegionID || '';
    const regionSupportsVLANs = doesRegionSupportFeature(
      selectedRegion,
      this.props.regionsData,
      'Vlans'
    );
    const payload = {
      authorized_users: this.props.authorized_users,
      backup_id: this.props.selectedBackupID,
      backups_enabled: this.props.backupsEnabled,
      booted: true,
      image: this.props.selectedImageID,
      label: this.props.label,
      private_ip: this.props.privateIPEnabled,
      region: this.props.selectedRegionID,
      root_pass: this.props.password,
      stackscript_data: this.props.selectedUDFs,
      // StackScripts
      stackscript_id: this.props.selectedStackScriptID,

      tags: this.props.tags
        ? this.props.tags.map((eachTag) => eachTag.label)
        : [],
      type: this.props.selectedTypeID,
    };

    if (
      regionSupportsVLANs &&
      this.props.selectedImageID &&
      this.props.vlanLabel
    ) {
      // Only submit interfaces in the payload if the region supports VLANs
      // and an image and VLAN have been selected.
      const interfaces = [defaultPublicInterface];
      if (Boolean(this.props.vlanLabel)) {
        interfaces.push({
          ipam_address: this.props.ipamAddress,
          label: this.props.vlanLabel,
          purpose: 'vlan',
        });
      }
      payload['interfaces'] = interfaces;
    }

    if (this.props.userData) {
      payload['metadata'] = {
        user_data: utoa(this.props.userData),
      };
    }

    return payload;
  };

  handleClickCreateUsingCommandLine = () => {
    const payload = {
      authorized_users: this.props.authorized_users,
      backup_id: this.props.selectedBackupID,
      backups_enabled: this.props.backupsEnabled,
      booted: true,
      image: this.props.selectedImageID,
      label: this.props.label,
      private_ip: this.props.privateIPEnabled,
      region: this.props.selectedRegionID,
      root_pass: this.props.password,
      stackscript_data: this.props.selectedUDFs,
      // StackScripts
      stackscript_id: this.props.selectedStackScriptID,

      tags: this.props.tags
        ? this.props.tags.map((eachTag) => eachTag.label)
        : [],
      type: this.props.selectedTypeID,
    };
    sendApiAwarenessClickEvent('Button', 'Create Using Command Line');
    this.props.checkValidation(payload);
  };

  handleTabChange = (index: number) => {
    this.props.resetCreationState();

    /** set the tab in redux state */
    this.props.setTab(this.tabs[index].type);

    /** Reset the plan panel since types may have shifted */

    this.setState({
      planKey: v4(),
      selectedTab: index,
    });
  };

  mounted: boolean = false;

  setNumberOfNodesForAppCluster = (num: number) => {
    this.setState({
      numberOfNodes: num,
    });
  };

  stackScriptTabs: CreateTab[] = [
    {
      routeName: `${this.props.match.url}?type=StackScripts&subtype=Account`,
      title: 'Account StackScripts',
      type: 'fromStackScript',
    },
    {
      routeName: `${this.props.match.url}?type=StackScripts&subtype=Community`,
      title: 'Community StackScripts',
      type: 'fromStackScript',
    },
  ];

  tabs: CreateTab[] = [
    {
      routeName: `${this.props.match.url}?type=Distributions`,
      title: 'Distributions',
      type: 'fromImage',
    },
    {
      routeName: `${this.props.match.url}?type=One-Click`,
      title: 'Marketplace',
      type: 'fromApp',
    },
    {
      routeName: `${this.props.match.url}?type=StackScripts`,
      title: 'StackScripts',
      type: 'fromStackScript',
    },
    {
      routeName: `${this.props.match.url}?type=Images`,
      title: 'Images',
      type: 'fromImage',
    },
    {
      routeName: `${this.props.match.url}?type=Backups`,
      title: 'Backups',
      type: 'fromBackup',
    },
    {
      routeName: `${this.props.match.url}?type=Clone%20Linode`,
      title: 'Clone Linode',
      type: 'fromLinode',
    },
  ];
}

const defaultPublicInterface: InterfacePayload = {
  ipam_address: '',
  label: '',
  purpose: 'public',
};

interface DispatchProps {
  setTab: (value: CreateTypes) => void;
}

const mapDispatchToProps: MapDispatchToProps<DispatchProps, CombinedProps> = (
  dispatch
) => ({
  setTab: (value) => dispatch(handleChangeCreateType(value)),
});

const connected = connect(undefined, mapDispatchToProps);

const enhanced = recompose<CombinedProps, InnerProps>(connected);

export default enhanced(LinodeCreate);
