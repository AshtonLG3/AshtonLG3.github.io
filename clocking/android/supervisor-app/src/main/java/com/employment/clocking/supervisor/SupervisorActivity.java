package com.employment.clocking.supervisor;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class SupervisorActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        loadSupervisorIntent(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        loadSupervisorIntent(intent);
    }

    private void loadSupervisorIntent(Intent intent) {
        if (bridge == null) {
            return;
        }

        Uri.Builder url = Uri.parse(bridge.getLocalUrl())
            .buildUpon()
            .path("/supervisor.html");
        Uri data = intent == null ? null : intent.getData();
        if (data != null) {
            for (String name : data.getQueryParameterNames()) {
                for (String value : data.getQueryParameters(name)) {
                    url.appendQueryParameter(name, value);
                }
            }
        }

        Uri supervisorUrl = url.build();
        bridge.getWebView().post(() -> bridge.getWebView().loadUrl(supervisorUrl.toString()));
    }
}
