package com.ultrabar.launch.common.communication.message.profile.convert.impl;

import com.ultrabar.launch.common.bean.HomeData;
import com.ultrabar.launch.common.bean.parameter.SenseCubeParameter;
import com.ultrabar.launch.common.bean.profile.Profile;
import com.ultrabar.launch.common.communication.bean.WidgetProperty;
import com.ultrabar.launch.common.communication.message.profile.convert.WidgetParamConverter;
import com.ultrabar.launch.common.enums.WidgetType;

/* JADX INFO: loaded from: classes3.dex */
public class SenseCubeParamConverter implements WidgetParamConverter {
    @Override // com.ultrabar.launch.common.communication.message.profile.convert.WidgetParamConverter
    public WidgetType getType() {
        return WidgetType.SENSE_CUBE;
    }

    @Override // com.ultrabar.launch.common.communication.message.profile.convert.WidgetParamConverter
    public HomeData convert(Profile profile, WidgetProperty widgetProperty) {
        widgetProperty.setParam(SenseCubeParameter.from(widgetProperty.getParam()));
        widgetProperty.setIcon(widgetProperty.getIcon());
        return widgetProperty;
    }
}