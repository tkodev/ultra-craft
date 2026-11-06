package com.ultrabar.launch.common.communication.message.profile.convert;

import com.ultrabar.launch.common.bean.HomeData;
import com.ultrabar.launch.common.bean.profile.Profile;
import com.ultrabar.launch.common.communication.bean.WidgetProperty;
import com.ultrabar.launch.common.communication.message.profile.convert.impl.AudioPlayerParameterConverter;
import com.ultrabar.launch.common.communication.message.profile.convert.impl.HotKeyGroupParamConverter;
import com.ultrabar.launch.common.communication.message.profile.convert.impl.PcBootParamConverter;
import com.ultrabar.launch.common.communication.message.profile.convert.impl.PcControlParamConverter;
import com.ultrabar.launch.common.communication.message.profile.convert.impl.SceneParamConverter;
import com.ultrabar.launch.common.communication.message.profile.convert.impl.SenseCubeAlsParamConverter;
import com.ultrabar.launch.common.communication.message.profile.convert.impl.SenseCubeAudioParamConverter;
import com.ultrabar.launch.common.communication.message.profile.convert.impl.SenseCubeHumParamConverter;
import com.ultrabar.launch.common.communication.message.profile.convert.impl.SenseCubeParamConverter;
import com.ultrabar.launch.common.communication.message.profile.convert.impl.SenseCubeRadarParamConverter;
import com.ultrabar.launch.common.communication.message.profile.convert.impl.SenseCubeTempParamConverter;
import com.ultrabar.launch.common.communication.message.profile.convert.impl.TimeParamConverter;
import com.ultrabar.launch.common.communication.message.profile.convert.impl.TimerParamConverter;
import com.ultrabar.launch.common.communication.message.profile.convert.impl.WeatherParamConverter;
import com.ultrabar.launch.common.communication.message.profile.convert.impl.WhiteNoiseParamConverter;
import com.ultrabar.launch.common.communication.message.profile.convert.impl.WorldTimeParamConverter;
import com.ultrabar.launch.common.enums.WidgetType;
import java.util.HashMap;
import java.util.Map;

/* JADX INFO: loaded from: classes3.dex */
public class WidgetCoverRegistry {
    private static final Map<WidgetType, WidgetParamConverter> CONVERTERS = new HashMap();

    static {
        register(new PcControlParamConverter());
        register(new WorldTimeParamConverter());
        register(new TimerParamConverter());
        register(new WeatherParamConverter());
        register(new WhiteNoiseParamConverter());
        register(new HotKeyGroupParamConverter());
        register(new SceneParamConverter());
        register(new AudioPlayerParameterConverter());
        register(new TimeParamConverter());
        register(new SenseCubeParamConverter());
        register(new SenseCubeAlsParamConverter());
        register(new SenseCubeRadarParamConverter());
        register(new SenseCubeTempParamConverter());
        register(new SenseCubeHumParamConverter());
        register(new SenseCubeAudioParamConverter());
        register(new PcBootParamConverter());
    }

    private static void register(WidgetParamConverter widgetParamConverter) {
        CONVERTERS.put(widgetParamConverter.getType(), widgetParamConverter);
    }

    public static HomeData cover(Profile profile, WidgetProperty widgetProperty) {
        if (widgetProperty.getType() == null) {
            widgetProperty.setType(WidgetType.UNSUPPORTED);
        }
        WidgetParamConverter widgetParamConverter = CONVERTERS.get(widgetProperty.getType());
        return widgetParamConverter != null ? widgetParamConverter.convert(profile, widgetProperty) : widgetProperty;
    }
}