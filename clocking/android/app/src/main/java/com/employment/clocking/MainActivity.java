package com.employment.clocking;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        loadClockingPath(startPath());
        loadClockingIntent(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        loadClockingIntent(intent);
    }

    protected String startPath() {
        return "/mobile.html";
    }

    private void loadClockingIntent(Intent intent) {
        if (bridge == null || intent == null || intent.getData() == null) {
            return;
        }

        Uri data = intent.getData();
        if (!"employmentclocking".equals(data.getScheme())) {
            return;
        }

        Uri.Builder localUrl = localUrlBuilder("/mobile.html");

        for (String name : data.getQueryParameterNames()) {
            for (String value : data.getQueryParameters(name)) {
                localUrl.appendQueryParameter(name, value);
            }
        }

        bridge.getWebView().post(() -> bridge.getWebView().loadUrl(localUrl.build().toString()));
    }

    protected void loadClockingPath(String path) {
        if (bridge == null) {
            return;
        }

        Uri url = localUrlBuilder(path).build();
        bridge.getWebView().post(() -> bridge.getWebView().loadUrl(url.toString()));
    }

    private Uri.Builder localUrlBuilder(String path) {
        return Uri.parse(bridge.getLocalUrl())
            .buildUpon()
            .path(path);
    }
}
