package com.thisai.crm;

import android.Manifest;
import android.app.DownloadManager;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.DownloadListener;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int REQUEST_PERMISSION_CODE = 1;
    private static final int REQUEST_CAMERA_PERMISSION_FOR_WEBVIEW = 2;
    private static final int REQUEST_MEDIA_PERMISSION_FOR_WEBVIEW = 3;
    private ValueCallback<Uri[]> filePathCallback;
    private PermissionRequest pendingPermissionRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Request runtime permissions for Android 6.0+
        requestNecessaryPermissions();

        // Configure WebView after Capacitor initialization
        configureBridgeWebView();
    }

    private void requestNecessaryPermissions() {
        // Request storage permissions for Android 6.0 - 12
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                    != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{
                        Manifest.permission.WRITE_EXTERNAL_STORAGE,
                        Manifest.permission.READ_EXTERNAL_STORAGE,
                        Manifest.permission.CAMERA,
                        Manifest.permission.RECORD_AUDIO
                    },
                    REQUEST_PERMISSION_CODE
                );
            }
        }
        // Request camera, microphone and notification permissions for Android 13+
        else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                    != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{
                        Manifest.permission.CAMERA,
                        Manifest.permission.POST_NOTIFICATIONS,
                        Manifest.permission.RECORD_AUDIO
                    },
                    REQUEST_PERMISSION_CODE
                );
            }
        }
        // Request camera and microphone permissions for Android 6.0+
        else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                    != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{
                        Manifest.permission.CAMERA,
                        Manifest.permission.RECORD_AUDIO
                    },
                    REQUEST_PERMISSION_CODE
                );
            }
        }
    }

    private void configureBridgeWebView() {
        // Get the Capacitor WebView
        WebView webView = getBridge().getWebView();

        if (webView != null) {
            WebSettings webSettings = webView.getSettings();

            // Enable JavaScript and DOM Storage (should already be enabled by Capacitor)
            webSettings.setJavaScriptEnabled(true);
            webSettings.setDomStorageEnabled(true);

            // Enable file access for downloads
            webSettings.setAllowFileAccess(true);
            webSettings.setAllowContentAccess(true);

            // Enable media playback and access
            webSettings.setMediaPlaybackRequiresUserGesture(false);

            // Disable zoom controls (optional, for better UX)
            webSettings.setBuiltInZoomControls(false);
            webSettings.setDisplayZoomControls(false);

            // **CRITICAL: Enable file downloads in WebView**
            webView.setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent,
                                          String contentDisposition, String mimeType,
                                          long contentLength) {

                    // Handle blob URLs and data URLs
                    if (url.startsWith("blob:") || url.startsWith("data:")) {
                        // For blob/data URLs, the download is handled by JavaScript
                        // The file should already be triggering a download via browser
                        Toast.makeText(getApplicationContext(),
                            "Preparing download...", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    // For regular HTTP/HTTPS URLs, use DownloadManager
                    try {
                        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                        request.setMimeType(mimeType);
                        request.addRequestHeader("User-Agent", userAgent);
                        request.setDescription("Downloading file...");
                        request.setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType));

                        request.allowScanningByMediaScanner();
                        request.setNotificationVisibility(
                            DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                        );

                        // Save to Downloads folder
                        request.setDestinationInExternalPublicDir(
                            Environment.DIRECTORY_DOWNLOADS,
                            URLUtil.guessFileName(url, contentDisposition, mimeType)
                        );

                        DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                        if (dm != null) {
                            dm.enqueue(request);
                            Toast.makeText(getApplicationContext(),
                                "Downloading file...", Toast.LENGTH_LONG).show();
                        }
                    } catch (Exception e) {
                        Toast.makeText(getApplicationContext(),
                            "Download failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                        e.printStackTrace();
                    }
                }
            });

            // **IMPORTANT: Setup WebChromeClient for camera access (file input + getUserMedia)**
            webView.setWebChromeClient(new WebChromeClient() {
                // Handle camera/file input for barcode scanner and file uploads
                @Override
                public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                                FileChooserParams fileChooserParams) {
                    // This enables camera access via <input type="file" capture="camera">
                    // Required for image uploads and camera-based features
                    return super.onShowFileChooser(webView, filePathCallback, fileChooserParams);
                }

                // **CRITICAL: Handle camera and microphone permission requests from getUserMedia() calls**
                // This is required for barcode scanners (camera) and AI Bill voice (microphone)
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    boolean needsCameraPermission = false;
                    boolean needsAudioPermission = false;

                    // Check what resources are being requested
                    for (String resource : request.getResources()) {
                        if (resource.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                            needsCameraPermission = true;
                        } else if (resource.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                            needsAudioPermission = true;
                        }
                    }

                    // Handle camera and/or microphone permission requests
                    if (needsCameraPermission || needsAudioPermission) {
                        boolean hasCameraPermission = !needsCameraPermission ||
                            ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                            == PackageManager.PERMISSION_GRANTED;

                        boolean hasAudioPermission = !needsAudioPermission ||
                            ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                            == PackageManager.PERMISSION_GRANTED;

                        // If we already have all required permissions, grant immediately
                        if (hasCameraPermission && hasAudioPermission) {
                            request.grant(request.getResources());
                            return;
                        }

                        // Otherwise, request the missing permissions
                        pendingPermissionRequest = request;
                        java.util.ArrayList<String> permissionsToRequest = new java.util.ArrayList<>();

                        if (needsCameraPermission && !hasCameraPermission) {
                            permissionsToRequest.add(Manifest.permission.CAMERA);
                        }
                        if (needsAudioPermission && !hasAudioPermission) {
                            permissionsToRequest.add(Manifest.permission.RECORD_AUDIO);
                        }

                        ActivityCompat.requestPermissions(
                            MainActivity.this,
                            permissionsToRequest.toArray(new String[0]),
                            REQUEST_MEDIA_PERMISSION_FOR_WEBVIEW
                        );
                        return;
                    }

                    // For other permissions, use default behavior
                    super.onPermissionRequest(request);
                }

                @Override
                public void onPermissionRequestCanceled(PermissionRequest request) {
                    super.onPermissionRequestCanceled(request);
                    pendingPermissionRequest = null;
                }
            });
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                          @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == REQUEST_PERMISSION_CODE) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }

            if (allGranted) {
                Toast.makeText(this, "Permissions granted", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this,
                    "Some permissions denied. Camera and downloads may not work.",
                    Toast.LENGTH_LONG).show();
            }
        }
        // Handle camera permission for WebView getUserMedia (legacy)
        else if (requestCode == REQUEST_CAMERA_PERMISSION_FOR_WEBVIEW) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission granted, now grant it to the WebView
                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                    pendingPermissionRequest = null;
                    Toast.makeText(this, "Camera access granted", Toast.LENGTH_SHORT).show();
                }
            } else {
                // Permission denied
                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.deny();
                    pendingPermissionRequest = null;
                }
                Toast.makeText(this,
                    "Camera permission denied. Scanner will not work.",
                    Toast.LENGTH_LONG).show();
            }
        }
        // Handle camera and/or microphone permissions for WebView getUserMedia
        else if (requestCode == REQUEST_MEDIA_PERMISSION_FOR_WEBVIEW) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }

            if (allGranted && pendingPermissionRequest != null) {
                // All permissions granted, grant to WebView
                pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                pendingPermissionRequest = null;
                Toast.makeText(this, "Media access granted", Toast.LENGTH_SHORT).show();
            } else {
                // Some permission denied
                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.deny();
                    pendingPermissionRequest = null;
                }
                Toast.makeText(this,
                    "Media permission denied. Camera/microphone features will not work.",
                    Toast.LENGTH_LONG).show();
            }
        }
    }
}
