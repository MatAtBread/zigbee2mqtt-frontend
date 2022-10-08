import React, { FunctionComponent, PropsWithChildren, useState } from 'react';


import { connect } from 'unistore/react';

import { pageState } from '../../pagestate';

import { DeviceState, CompositeFeature, GenericExposedFeature, FeatureAccessMode, Device, Paths } from '../../types';
import actions from '../../actions/actions';
import { StateApi } from "../../actions/StateApi";
import { GlobalState } from '../../store';
import { genDeviceDetailsLink } from '../../utils';

import { isClimateFeature, isLightFeature } from '../device-page/type-guards';
import groupBy from "lodash/groupBy";

import { filterDeviceByFeatures } from '../groups/DeviceGroupRow';
import { Table } from '../grid/ReactTableCom';
import { DEVICES_GLOBAL_NAME } from '../zigbee/DevicesTable';
import { Feature } from '../features/composite/Feature';
import { FeatureWrapperProps } from '../features/composite/FeatureWrapper';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import DeviceImage from '../device-image';
import style from "../zigbee/style.module.css";

type PropsFromStore = Pick<GlobalState, 'devices' | 'deviceStates' | 'bridgeInfo'>;

const genericRendererIgnoredNames = [
    'linkquality', 'battery', 'battery_low',
    'illuminance_lux', 'color_temp_startup', 'voltage',
    'strength', 'color_options', 'warning', 'position',
    'operation_mode', 'operation_mode2', 'programming_mode',
    'options', 'programming',
    'schedule_monday', 'schedule_tuesday', 'schedule_wednesday',
    'schedule_thursday', 'schedule_friday', 'schedule_saturday', 'schedule_sunday',
    'holiday_mode_date'];

const defaultWhitelistFeatureNames = ["force","position","local_temperature","current_heating_setpoint","running_state","preset"];//['state', 'brightness', 'color_temp', 'mode', 'sound', 'occupancy', 'tamper', 'alarm', 'current_heating_setpoint', 'force'];

export const onlyValidFeatures = (whitelistFeatureNames: string[], nested = 0) =>
    (feature: GenericExposedFeature | CompositeFeature, deviceState: DeviceState = {} as DeviceState): GenericExposedFeature | CompositeFeature | false => {
        const { property, name } = feature;
        let { features } = feature as CompositeFeature;
        if (isLightFeature(feature) || isClimateFeature(feature)) {
            features = features.map(f => onlyValidFeatures(whitelistFeatureNames, nested + 1)(f, (property ? deviceState[property] : deviceState) as DeviceState)).filter(f => f) as (GenericExposedFeature | CompositeFeature)[];
            const groupedFeatures = groupBy(features, 'property');
            features = Object.values(groupedFeatures).map(f => f[0]);
            if (features.length)
                return { ...feature, features };
        }
        const filteredOutFeature = { ...feature, features } as GenericExposedFeature | CompositeFeature;
        return whitelistFeatureNames[0] === '*' || whitelistFeatureNames.includes(name) ? filteredOutFeature : false;
    }

const filterKeys: Paths<Device>[] = [
    'friendly_name',
    'description',
    'ieee_address',
    'manufacturer',
    'type',
    'power_source',
    'model_id',
    'definition.model',
    'definition.vendor'
];

function findFeature(property: string, features: (GenericExposedFeature | CompositeFeature)[]) {
    for (const f of features) {
        if (f.property === property) {
            return f;
        }
        if ('features' in f && f.features) {
            const p = findFeature(property, f.features);
            if (p)
                return p;
        }
    }
}

const Dashboard: React.FC<PropsFromStore & StateApi> = (props) => {
    const { setDeviceState, getDeviceState, deviceStates, bridgeInfo, devices } = props;

    const FeatureWrapper: FunctionComponent<PropsWithChildren<FeatureWrapperProps>> = (props) => {
        const { children, feature } = props;
        return <div className="d-flex align-items-center">
            {feature.endpoint ? feature.endpoint : null}
            <div className="flex-shrink-1">{children}</div>
        </div>
    }

    const selectedFeatures = pageState()?.home?.featureNames || defaultWhitelistFeatureNames;
    const { t } = useTranslation(["featureNames"])
    const filteredDeviceFeatures = filterDeviceByFeatures(devices, deviceStates, onlyValidFeatures(selectedFeatures));
    const columns = [{
        id: '0-dev',
        Cell: ({ row: { index, original }, column: { id } }) => <><Link to={genDeviceDetailsLink(filteredDeviceFeatures[index].device.ieee_address)}>
            <DeviceImage device={filteredDeviceFeatures[index].device} className={style["device-image"]} />

        </Link></>
    }, {
        id: '0=name',
        Header: useTranslation("zigbee").t('device'),
        Cell: ({ row: { index, original }, column: { id } }) => <>{filteredDeviceFeatures[index].device.friendly_name}</>
    },
    ...selectedFeatures.map(name => ({
        id: name,
        Header: t(name),
        Cell: ({ row: { index, original }, column: { id } }) => {
            const feature = findFeature(id, filteredDeviceFeatures[index].filteredFeatures);
            return feature ? (<>
                <Feature feature={feature}
                    device={original.device}
                    deviceState={original.deviceState}
                    featureWrapperClass={FeatureWrapper}
                    minimal={true}
                    onChange={(endpoint, value) =>
                        setDeviceState(filteredDeviceFeatures[index].device.friendly_name, value)
                    }
                    onRead={(endpoint, value) =>
                        getDeviceState(filteredDeviceFeatures[index].device.friendly_name, value)
                    }
                />
            </>) : (<></>)
        }
    }))];

    return <div className="table-responsive">
        <Table
            noFilter={true}
            noRowNumbers={true}
            id={DEVICES_GLOBAL_NAME}
            columns={columns}
            data={filteredDeviceFeatures} />
    </div>

};

const mappedProps = ['devices', 'deviceStates', 'bridgeInfo'];
export default connect<unknown, unknown, GlobalState, unknown>(mappedProps, actions)(Dashboard);


