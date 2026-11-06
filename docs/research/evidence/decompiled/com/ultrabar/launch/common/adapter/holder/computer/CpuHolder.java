package com.ultrabar.launch.common.adapter.holder.computer;

import androidx.lifecycle.LifecycleOwner;
import androidx.lifecycle.Observer;
import androidx.media3.common.C;
import com.alibaba.fastjson.JSONObject;
import com.ultrabar.launch.common.base.BaseHolder;
import com.ultrabar.launch.common.extension.metrics.MetricsBus;
import com.ultrabar.launch.common.extension.metrics.enums.MetricType;
import com.ultrabar.launch.common.extension.metrics.event.MetricEvent;
import com.ultrabar.launch.common.extension.metrics.schedule.QuerySchedule;
import com.ultrabar.launch.common.utils.HomeHolderListener;
import com.ultrabar.launch.databinding.CpuLayoutBinding;

/* JADX INFO: loaded from: classes3.dex */
public class CpuHolder extends BaseHolder {
    public static final String TAG = "CpuHolder";
    private final CpuLayoutBinding binding;
    private final LifecycleOwner mOwner;
    private final Observer<MetricEvent> obs;

    public CpuHolder(CpuLayoutBinding cpuLayoutBinding, LifecycleOwner lifecycleOwner, HomeHolderListener homeHolderListener) {
        super(false, cpuLayoutBinding.getRoot(), homeHolderListener);
        this.obs = new Observer<MetricEvent>() { // from class: com.ultrabar.launch.common.adapter.holder.computer.CpuHolder.1
            @Override // androidx.lifecycle.Observer
            public void onChanged(MetricEvent metricEvent) {
                try {
                    CpuHolder.this.binding.gauge.setProgressAnimated(((JSONObject) metricEvent.getMetric().getData()).getIntValue("payload"));
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        };
        this.mOwner = lifecycleOwner;
        this.binding = cpuLayoutBinding;
    }

    @Override // com.ultrabar.launch.common.base.BaseHolder
    protected void updateUI() {
        try {
            MetricsBus.getInstance().subscribe(MetricType.CPU, this.mOwner, this.obs, QuerySchedule.periodic(C.DEFAULT_MAX_SEEK_TO_PREVIOUS_POSITION_MS, null));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override // com.ultrabar.launch.common.base.BaseHolder
    public void onViewRecycled() {
        super.onViewRecycled();
        MetricsBus.getInstance().unsubscribe(MetricType.CPU, this.obs);
    }
}