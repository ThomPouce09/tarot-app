package com.tarot.divination;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Masquage au démarrage (fenêtre pas toujours attachée → ré-appliqué
        // aussi sur onWindowFocusChanged, plus fiable).
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    /**
     * Plein écran immersif : étend le contenu sous la barre d'état et la barre
     * de navigation, puis les MASQUE (révélables d'un swipe). L'app occupe 100%
     * de l'écran. Compatible API >= 30 (WindowInsetsController, la seule méthode
     * efficace sur Android 15+ où setSystemUiVisibility est neutralisé) et
     * API < 30 (flags legacy).
     */
    private void hideSystemBars() {
        View decor = getWindow().getDecorView();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        }

        // Doublon legacy (no-op sur Android 15+, utile sur les appareils plus
        // anciens / certains OEM) : garantit le masquage même si le contrôleur
        // d'insets est null.
        decor.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }
}
