package com.ultrabar.launch.common.adapter.holder.sense;

import androidx.lifecycle.LifecycleOwner;
import androidx.lifecycle.Observer;
import com.ultrabar.launch.common.base.BaseHolder;
import com.ultrabar.launch.common.bean.parameter.SenseCubeParameter;
import com.ultrabar.launch.common.extension.databus.DataBus;
import com.ultrabar.launch.common.module.property.SenseCubeProperty;
import com.ultrabar.launch.common.utils.HomeHolderListener;
import com.ultrabar.launch.common.utils.databus.publish.PublishGeneral;
import com.ultrabar.launch.databinding.SenseCubeWidgetBinding;
import xilef.util.base.LogUtils;

/* JADX INFO: loaded from: classes3.dex */
public class SenseCubeHolder extends BaseHolder implements Observer<PublishGeneral> {
    private static final String TAG = "SenseCubeHolder";
    private final SenseCubeWidgetBinding binding;
    private final LifecycleOwner mOwner;
    private SenseCubeParameter pat;

    @Override // com.ultrabar.launch.common.base.BaseHolder
    protected boolean isBindRootClick() {
        return false;
    }

    public SenseCubeHolder(SenseCubeWidgetBinding senseCubeWidgetBinding, LifecycleOwner lifecycleOwner, HomeHolderListener homeHolderListener) {
        super(false, senseCubeWidgetBinding.getRoot(), homeHolderListener);
        this.binding = senseCubeWidgetBinding;
        this.mOwner = lifecycleOwner;
    }

    @Override // com.ultrabar.launch.common.base.BaseHolder
    public void updateUI() {
        this.pat = (SenseCubeParameter) this.mData.getParam(SenseCubeParameter.class);
        DataBus.getInstance().subscribe(this.pat.getUid(), this.mOwner, this);
    }

    @Override // com.ultrabar.launch.common.base.BaseHolder
    public void onViewRecycled() {
        super.onViewRecycled();
        try {
            DataBus.getInstance().unsubscribe(this.pat.getUid(), this);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override // androidx.lifecycle.Observer
    public void onChanged(PublishGeneral publishGeneral) {
        if (publishGeneral.getType() != PublishGeneral.Type.SENSE_CUBE_REPORT) {
            LogUtils.d(TAG, "未知的数据");
            return;
        }
        SenseCubeProperty senseCubeProperty = (SenseCubeProperty) publishGeneral.getValue();
        if (senseCubeProperty.getProperty() == 5) {
            this.binding.humidityView.setHumidity(((Float) senseCubeProperty.getValue()).intValue());
        } else if (senseCubeProperty.getProperty() == 1) {
            this.binding.temperatureView.setTemperature(((Float) senseCubeProperty.getValue()).intValue());
        }
    }
}