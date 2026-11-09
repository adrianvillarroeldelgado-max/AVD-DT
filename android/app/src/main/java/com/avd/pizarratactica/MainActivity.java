package com.avd.pizarratactica;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.window.OnBackInvokedDispatcher;

import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Pizarra Táctica · AVD D.T Fútbol.
 * Abre la web publicada en GitHub Pages (WEB_URL, variable del repositorio): cada
 * cambio que subes a la web aparece en la app sin instalar nada, y el service
 * worker de la web la deja disponible sin conexión. Si no hay WEB_URL, usa la
 * copia de la web que va dentro del APK (assets/www). El puente «AndroidBridge» (js/android.js) añade lo que un
 * WebView no hace solo: guardar y compartir archivos, imprimir, pantalla completa
 * y el botón Atrás.
 */
public class MainActivity extends Activity {
    private static final String LOCAL_URL = "https://appassets.androidplatform.net/www/index.html";
    private static final String WEB_URL = BuildConfig.WEB_URL.trim();
    private static final String START_URL = WEB_URL.isEmpty() ? LOCAL_URL : WEB_URL;
    private static final String HOME_HOST = Uri.parse(START_URL).getHost();
    private static final int REQ_FILE = 1001;
    private static final int REQ_MIC = 1002;

    private static final String OFFLINE_HTML = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
            + "<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0B1F3A;color:#fff;font-family:sans-serif;text-align:center;padding:24px;box-sizing:border-box}"
            + "h1{font-size:22px;margin:0 0 10px}p{opacity:.85;line-height:1.5}a{display:inline-block;margin-top:18px;background:#FF5A1F;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold}</style></head>"
            + "<body><div><h1>Sin conexión</h1><p>La primera vez la app necesita internet para descargar la Pizarra.<br>Después funciona también sin conexión.</p><a href='pizarra://reintentar'>Reintentar</a></div></body></html>";

    private WebView webView;
    private FrameLayout root;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingPermission;
    private Object backCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        root = new FrameLayout(this);
        root.setBackgroundColor(0xFF0B1F3A);
        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        applyInsets();

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setTextZoom(100);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                // Primera apertura sin internet (todavía no hay copia guardada de la web)
                if (request.isForMainFrame()) {
                    view.loadDataWithBaseURL(null, OFFLINE_HTML, "text/html", "utf-8", null);
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                // La web todavía no está publicada o GitHub Pages devolvió un error: pantalla propia con «Reintentar»
                if (request.isForMainFrame() && response.getStatusCode() >= 400) {
                    String html = OFFLINE_HTML.replace("Sin conexión", "La Pizarra no está disponible (" + response.getStatusCode() + ")")
                            .replace("La primera vez la app necesita internet para descargar la Pizarra.<br>Después funciona también sin conexión.",
                                    "La web todavía se está publicando o no se encontró.<br>Espera un par de minutos y vuelve a intentarlo.");
                    view.loadDataWithBaseURL(null, html, "text/html", "utf-8", null);
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (url != null && url.startsWith("http")) view.getSettings().setCacheMode(WebSettings.LOAD_DEFAULT);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if ("pizarra".equals(request.getUrl().getScheme())) {
                    // Reintentar sin usar la copia guardada (por si guardó una página de error)
                    view.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
                    view.loadUrl(START_URL);
                    return true;
                }
                Uri u = request.getUrl();
                if ("appassets.androidplatform.net".equals(u.getHost()) || (HOME_HOST != null && HOME_HOST.equals(u.getHost()))) return false;
                // Enlaces externos (YouTube, Vimeo, páginas web): en el navegador del teléfono
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (ActivityNotFoundException ignored) { }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = params.createIntent();
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(Intent.createChooser(intent, "Elegir archivo"), REQ_FILE);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean wantsMic = false;
                    for (String r : request.getResources()) if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) wantsMic = true;
                    if (!wantsMic) { request.deny(); return; }
                    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    } else {
                        pendingPermission = request;
                        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
                    }
                });
            }
        });

        webView.addJavascriptInterface(new Bridge(), "AndroidBridge");
        setupBack();

        if (savedInstanceState != null) webView.restoreState(savedInstanceState);
        else webView.loadUrl(START_URL);
    }

    /* Respeta la barra de estado y la de navegación (Android 15+ dibuja de borde a borde) */
    private void applyInsets() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime() | WindowInsets.Type.displayCutout());
                v.setPadding(i.left, i.top, i.right, i.bottom);
                return WindowInsets.CONSUMED;
            });
        } else {
            root.setFitsSystemWindows(true);
        }
    }

    /* Atrás: primero cierra el diálogo o panel abierto en la app; si no hay nada, sale */
    private void setupBack() {
        if (Build.VERSION.SDK_INT >= 33) {
            android.window.OnBackInvokedCallback cb = this::handleBack;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, cb);
            backCallback = cb;
        }
    }

    private void handleBack() {
        webView.evaluateJavascript("(function(){try{return window.__avdBack?window.__avdBack():false}catch(e){return false}})()", value -> {
            if (!"true".equals(value)) moveTaskToBack(true);
        });
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        handleBack();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_FILE || fileCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int n = data.getClipData().getItemCount();
                result = new Uri[n];
                for (int i = 0; i < n; i++) result[i] = data.getClipData().getItemAt(i).getUri();
            } else if (data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
        }
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_MIC && pendingPermission != null) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED)
                pendingPermission.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            else pendingPermission.deny();
            pendingPermission = null;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    private void toast(final String msg) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show());
    }

    private File writeShared(String base64, String name) throws Exception {
        File dir = new File(getCacheDir(), "shared");
        if (!dir.exists() && !dir.mkdirs()) throw new Exception("No se pudo crear la carpeta temporal");
        File f = new File(dir, name.replaceAll("[\\\\/:*?\"<>|]", "_"));
        try (FileOutputStream out = new FileOutputStream(f)) {
            out.write(Base64.decode(base64, Base64.DEFAULT));
        }
        return f;
    }

    private void shareFile(File f, String mime, String title) {
        Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".files", f);
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType(mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
        send.putExtra(Intent.EXTRA_STREAM, uri);
        send.putExtra(Intent.EXTRA_SUBJECT, title);
        send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivity(Intent.createChooser(send, title));
    }

    /** Puente con la app web */
    public class Bridge {
        @JavascriptInterface
        public boolean isAndroid() { return true; }

        /** Guarda el archivo en Descargas (Android 10+) o lo ofrece para guardar/compartir. Devuelve el aviso para la app. */
        @JavascriptInterface
        public String saveFile(String base64, String name, String mime) {
            try {
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.Downloads.DISPLAY_NAME, name);
                    v.put(MediaStore.Downloads.MIME_TYPE, mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
                    v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Pizarra DT Futbol");
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    if (uri == null) throw new Exception("Sin acceso a Descargas");
                    try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                        if (out == null) throw new Exception("Sin acceso a Descargas");
                        out.write(Base64.decode(base64, Base64.DEFAULT));
                    }
                    return "Guardado en Descargas › Pizarra DT Futbol: " + name;
                } else {
                    final File f = writeShared(base64, name);
                    runOnUiThread(() -> MainActivity.this.shareFile(f, mime, "Guardar o enviar " + name));
                    return "Elige dónde guardar o enviar " + name;
                }
            } catch (Exception e) {
                return "No se pudo guardar: " + e.getMessage();
            }
        }

        /** Abre el menú Compartir de Android (WhatsApp, correo, Drive…) */
        @JavascriptInterface
        public void shareFile(String base64, String name, String mime, String title) {
            try {
                final File f = writeShared(base64, name);
                final String t = title == null || title.isEmpty() ? name : title;
                runOnUiThread(() -> MainActivity.this.shareFile(f, mime, t));
            } catch (Exception e) {
                toast("No se pudo compartir: " + e.getMessage());
            }
        }

        /** Imprimir o «Guardar como PDF» con el servicio de impresión de Android */
        @JavascriptInterface
        public void print(final String title) {
            runOnUiThread(() -> {
                PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                String t = title == null || title.isEmpty() ? "Pizarra Tactica" : title;
                pm.print(t, webView.createPrintDocumentAdapter(t), new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
            });
        }

        /** Pantalla completa para el modo presentación */
        @JavascriptInterface
        public void immersive(final boolean on) {
            runOnUiThread(() -> {
                Window w = getWindow();
                if (Build.VERSION.SDK_INT >= 30) {
                    WindowInsetsController c = w.getInsetsController();
                    if (c == null) return;
                    if (on) {
                        c.hide(WindowInsets.Type.systemBars());
                        c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                    } else c.show(WindowInsets.Type.systemBars());
                } else {
                    View d = w.getDecorView();
                    d.setSystemUiVisibility(on ? (View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY) : 0);
                }
            });
        }

        /** La app web está lista: aplica el tema a las barras del sistema */
        @JavascriptInterface
        public void ready(String theme) { theme(theme); }

        /** Tema claro u oscuro: color de fondo detrás de las barras e iconos de la barra de estado */
        @JavascriptInterface
        public void theme(final String theme) {
            runOnUiThread(() -> {
                boolean dark = "dark".equals(theme);
                root.setBackgroundColor(dark ? 0xFF181818 : 0xFFEDEDED);
                if (Build.VERSION.SDK_INT >= 30) {
                    WindowInsetsController c = getWindow().getInsetsController();
                    if (c != null) {
                        int flags = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                        c.setSystemBarsAppearance(dark ? 0 : flags, flags);
                    }
                } else if (Build.VERSION.SDK_INT >= 23) {
                    Window w = getWindow();
                    w.setStatusBarColor(dark ? 0xFF181818 : 0xFF0B1F3A);
                    w.setNavigationBarColor(dark ? 0xFF181818 : 0xFF0B1F3A);
                }
            });
        }

        /** Salir de la app (cuando no queda nada que cerrar) */
        @JavascriptInterface
        public void exit() {
            runOnUiThread(() -> moveTaskToBack(true));
        }
    }
}
