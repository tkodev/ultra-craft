package com.ultrabar.launch.common.manager;

import android.app.ActivityManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.os.Bundle;
import chief.utils.FindUtils;
import chief.utils.ScheduledDataUpdater;
import com.alibaba.fastjson.JSONObject;
import com.ultrabar.launch.common.bean.AppData;
import com.ultrabar.launch.common.bean.PluginConfig;
import com.ultrabar.launch.common.mvvm.datasource.HomeDataSource;
import com.ultrabar.launch.common.utils.AppUtils;
import com.ultrabar.launch.common.utils.PortUtils;
import com.ultrabar.launch.common.utils.SharedPreferencesUtils;
import com.ultrabar.plugin.model.CallResultPayload;
import com.ultrabar.plugin.model.ConfigServer;
import com.ultrabar.plugin.model.DescribeResultPayload;
import com.ultrabar.plugin.model.EventPayload;
import com.ultrabar.plugin.model.GetOptionsResultPayload;
import com.ultrabar.plugin.model.Heartbeat;
import com.ultrabar.plugin.model.RegisterPayload;
import com.ultrabar.plugin.model.RegisterResultPayload;
import com.ultrabar.server.PluginRegisterHandler;
import com.ultrabar.server.PluginServer;
import com.ultrabar.server.PluginServerListener;
import com.ultrabar.server.PluginSession;
import java.util.Collection;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import xilef.util.base.LogUtils;

/* JADX INFO: loaded from: classes3.dex */
public class PluginServerManager implements PluginServerListener {
    private static final String TAG = "PluginServerManager";
    private final PluginServer server;
    private ScheduledDataUpdater updater;

    @Override // com.ultrabar.server.PluginServerListener
    public void onRegistered(PluginSession pluginSession) {
    }

    /* synthetic */ PluginServerManager(AnonymousClass1 anonymousClass1) {
        this();
    }

    private PluginServerManager() {
        PluginServer pluginServer = new PluginServer();
        this.server = pluginServer;
        pluginServer.setRegisterHandler(new AnonymousClass1());
        pluginServer.setListener(this);
    }

    /* JADX INFO: renamed from: com.ultrabar.launch.common.manager.PluginServerManager$1, reason: invalid class name */
    class AnonymousClass1 implements PluginRegisterHandler {
        AnonymousClass1() {
        }

        @Override // com.ultrabar.server.PluginRegisterHandler
        public RegisterResultPayload handleRegister(final RegisterPayload registerPayload) throws Exception {
            RegisterResultPayload registerResultPayload = new RegisterResultPayload();
            registerResultPayload.success = true;
            registerResultPayload.configServer = new ConfigServer();
            registerResultPayload.heartbeat = new Heartbeat();
            registerResultPayload.heartbeat.interval = 5000;
            registerResultPayload.heartbeat.timeout = 8000;
            if (registerPayload.isConfig) {
                List<PluginConfig> pluginConfigs = SharedPreferencesUtils.getIns().getData().getPluginConfigs();
                FindUtils.FindData findDataFindOne = FindUtils.findOne(pluginConfigs, new Predicate() { // from class: com.ultrabar.launch.common.manager.PluginServerManager$1$$ExternalSyntheticLambda0
                    @Override // java.util.function.Predicate
                    public final boolean test(Object obj) {
                        return ((PluginConfig) obj).getPackageName().equals(registerPayload.packageName);
                    }
                });
                if (findDataFindOne == null) {
                    Set<Integer> set = (Set) pluginConfigs.stream().map(new Function() { // from class: com.ultrabar.launch.common.manager.PluginServerManager$1$$ExternalSyntheticLambda1
                        @Override // java.util.function.Function
                        public final Object apply(Object obj) {
                            return Integer.valueOf(((PluginConfig) obj).getPort());
                        }
                    }).collect(Collectors.toSet());
                    PortUtils portUtils = new PortUtils();
                    portUtils.setReservedPort(set);
                    final int iFindAvailablePort = portUtils.findAvailablePort();
                    final String string = UUID.randomUUID().toString();
                    SharedPreferencesUtils.getIns().update(new Function() { // from class: com.ultrabar.launch.common.manager.PluginServerManager$1$$ExternalSyntheticLambda2
                        @Override // java.util.function.Function
                        public final Object apply(Object obj) {
                            return PluginServerManager.AnonymousClass1.lambda$handleRegister$3(registerPayload, string, iFindAvailablePort, (AppData) obj);
                        }
                    });
                    registerResultPayload.sessionToken = string;
                    registerResultPayload.configServer.port = iFindAvailablePort;
                } else {
                    PluginConfig pluginConfig = (PluginConfig) findDataFindOne.getData();
                    registerResultPayload.sessionToken = pluginConfig.getSessionToken();
                    registerResultPayload.configServer.port = pluginConfig.getPort();
                }
            }
            return registerResultPayload;
        }

        static /* synthetic */ Boolean lambda$handleRegister$3(final RegisterPayload registerPayload, String str, int i, AppData appData) {
            final List<PluginConfig> pluginConfigs = appData.getPluginConfigs();
            PluginConfig pluginConfigOrElseGet = pluginConfigs.stream().filter(new Predicate() { // from class: com.ultrabar.launch.common.manager.PluginServerManager$1$$ExternalSyntheticLambda3
                @Override // java.util.function.Predicate
                public final boolean test(Object obj) {
                    return ((PluginConfig) obj).getPackageName().equals(registerPayload.packageName);
                }
            }).findFirst().orElseGet(new Supplier() { // from class: com.ultrabar.launch.common.manager.PluginServerManager$1$$ExternalSyntheticLambda4
                @Override // java.util.function.Supplier
                public final Object get() {
                    return PluginServerManager.AnonymousClass1.lambda$handleRegister$2(registerPayload, pluginConfigs);
                }
            });
            pluginConfigOrElseGet.setSessionToken(str);
            pluginConfigOrElseGet.setPort(i);
            appData.setPluginConfigs(pluginConfigs);
            return true;
        }

        static /* synthetic */ PluginConfig lambda$handleRegister$2(RegisterPayload registerPayload, List list) {
            PluginConfig pluginConfig = new PluginConfig(registerPayload.packageName, null, 0, true, registerPayload.configBtnName);
            list.add(pluginConfig);
            return pluginConfig;
        }
    }

    private static class Holder {
        private static final PluginServerManager INSTANCE = new PluginServerManager(null);

        private Holder() {
        }
    }

    public static PluginServerManager getInstance() {
        return Holder.INSTANCE;
    }

    public PluginServerManager start() {
        try {
            this.server.start();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return this;
    }

    public void stop() {
        this.server.stop();
    }

    private Set<String> getRunningServiceNames(Context context) {
        HashSet hashSet = new HashSet();
        ActivityManager activityManager = (ActivityManager) context.getSystemService("activity");
        if (activityManager == null) {
            return hashSet;
        }
        try {
            for (ActivityManager.RunningServiceInfo runningServiceInfo : activityManager.getRunningServices(Integer.MAX_VALUE)) {
                if (runningServiceInfo.service != null) {
                    hashSet.add(runningServiceInfo.service.getClassName());
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return hashSet;
    }

    private boolean isServiceRunning(Context context, String str) {
        return getRunningServiceNames(context).contains(str);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public Intent getIntent(PackageInfo packageInfo, Set<String> set) {
        String string;
        ServiceInfo[] serviceInfoArr = packageInfo.services;
        if (serviceInfoArr == null) {
            return null;
        }
        for (ServiceInfo serviceInfo : serviceInfoArr) {
            Bundle bundle = serviceInfo.metaData;
            if (bundle != null && (string = bundle.getString("ultrabar.plugin")) != null && !string.isEmpty()) {
                if (set.contains(serviceInfo.name)) {
                    return null;
                }
                Intent intent = new Intent();
                intent.setComponent(new ComponentName(packageInfo.packageName, serviceInfo.name));
                return intent;
            }
        }
        return null;
    }

    private List<Intent> scanner(Context context) {
        HomeDataSource homeDataSource = new HomeDataSource(context);
        final Set<String> runningServiceNames = getRunningServiceNames(context);
        return homeDataSource.getInsAppInfo("pluginScanner", AppUtils.AppType.ALL, new HomeDataSource.Convert<Intent>() { // from class: com.ultrabar.launch.common.manager.PluginServerManager.2
            /* JADX WARN: Can't rename method to resolve collision */
            @Override // com.ultrabar.launch.common.mvvm.datasource.HomeDataSource.Convert
            public Intent convert(PackageManager packageManager, PackageInfo packageInfo) {
                return PluginServerManager.this.getIntent(packageInfo, runningServiceNames);
            }
        }, false);
    }

    public PluginServerManager startService(Context context) {
        startService(context, scanner(context));
        return this;
    }

    private void startService(Context context, List<Intent> list) {
        Iterator<Intent> it = list.iterator();
        while (it.hasNext()) {
            try {
                context.startForegroundService(it.next());
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public void autoScanner(final Context context) {
        ScheduledDataUpdater scheduledDataUpdater = new ScheduledDataUpdater() { // from class: com.ultrabar.launch.common.manager.PluginServerManager.3
            @Override // chief.utils.ScheduledDataUpdater
            protected void updateData() throws Exception {
                PluginServerManager.this.startService(context);
            }
        };
        this.updater = scheduledDataUpdater;
        scheduledDataUpdater.start();
    }

    public PluginConfig getConfig(final String str) {
        return SharedPreferencesUtils.getIns().getData().getPluginConfigs().stream().filter(new Predicate() { // from class: com.ultrabar.launch.common.manager.PluginServerManager$$ExternalSyntheticLambda0
            @Override // java.util.function.Predicate
            public final boolean test(Object obj) {
                return ((PluginConfig) obj).getPackageName().equals(str);
            }
        }).findFirst().orElse(null);
    }

    public Collection<PluginSession> getSession() {
        return this.server.sessions();
    }

    public PluginSession getSession(String str) {
        return this.server.getSession(str);
    }

    public CompletableFuture<CallResultPayload> call(String str, String str2, Map<String, Object> map) {
        return this.server.call(str, str2, map);
    }

    public CompletableFuture<DescribeResultPayload> getDescribe(String str, String str2) {
        return this.server.getDescribe(str, str2);
    }

    public CompletableFuture<GetOptionsResultPayload> getOptions(String str, String str2, String str3, String str4, String str5, int i, Map<String, Object> map) {
        return this.server.getOptions(str, str2, str3, str4, str5, i, map);
    }

    @Override // com.ultrabar.server.PluginServerListener
    public void onActionsUpdated(PluginSession pluginSession) {
        super.onActionsUpdated(pluginSession);
    }

    @Override // com.ultrabar.server.PluginServerListener
    public void onEventReceived(PluginSession pluginSession, EventPayload eventPayload) {
        LogUtils.d(TAG, "接收到事件了:%s,%s", pluginSession.packageName(), JSONObject.toJSON(eventPayload));
    }
}