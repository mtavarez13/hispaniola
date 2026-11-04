package com.hispaniolapay.mobile;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.view.View;
import android.view.animation.LinearInterpolator;

import java.util.ArrayList;
import java.util.List;

/** Fondo animado nativo para la pantalla de acceso. No intercepta gestos ni toques. */
public final class LoginBrandRainView extends View {
    private static final int HISPANIOLA = 0;
    private static final int BINANCE = 1;
    private static final int MONEY = 2;
    private static final int BHD = 3;
    private static final int POPULAR = 4;
    private static final int ZELLE = 5;
    private static final int PAYPAL = 6;

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
    private final RectF bounds = new RectF();
    private final Path path = new Path();
    private final List<Particle> particles = new ArrayList<>();
    private final Bitmap hispaniolaMark;
    private final ValueAnimator animator;
    private float progress;

    public LoginBrandRainView(Context context) {
        super(context);
        setClickable(false);
        setFocusable(false);
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        hispaniolaMark = BitmapFactory.decodeResource(getResources(), R.drawable.hispaniolapay_mark);
        seedParticles();

        animator = ValueAnimator.ofFloat(0f, 1f);
        animator.setDuration(28_000L);
        animator.setRepeatCount(ValueAnimator.INFINITE);
        animator.setInterpolator(new LinearInterpolator());
        animator.addUpdateListener(value -> {
            progress = (float) value.getAnimatedValue();
            invalidate();
        });
    }

    private void seedParticles() {
        int[] kinds = {
                HISPANIOLA, MONEY, BINANCE, ZELLE, BHD, PAYPAL, POPULAR,
                MONEY, HISPANIOLA, BINANCE, BHD, MONEY, ZELLE, PAYPAL,
                POPULAR, MONEY, BINANCE, HISPANIOLA, ZELLE, MONEY, BHD
        };
        String[] money = {"$", "RD$", "HTG", "$", "G", "RD$", "$"};
        int moneyIndex = 0;
        for (int i = 0; i < kinds.length; i++) {
            int kind = kinds[i];
            float x = ((i * 37) % 101) / 100f;
            float phase = ((i * 53) % 100) / 100f;
            float speed = 0.68f + ((i * 11) % 35) / 100f;
            float size = 34f + ((i * 13) % 25);
            float drift = -34f + ((i * 29) % 69);
            String label = kind == MONEY ? money[moneyIndex++ % money.length] : "";
            particles.add(new Particle(kind, x, phase, speed, size, drift, label));
        }
    }

    @Override protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        if (!animator.isStarted()) animator.start();
    }

    @Override protected void onDetachedFromWindow() {
        animator.cancel();
        super.onDetachedFromWindow();
    }

    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        if (getWidth() == 0 || getHeight() == 0) return;
        float density = getResources().getDisplayMetrics().density;
        for (Particle particle : particles) {
            float cycle = (particle.phase + progress * particle.speed) % 1f;
            float size = particle.size * density;
            float x = particle.x * getWidth() + (cycle - .5f) * particle.drift * density;
            float y = -size * 1.5f + cycle * (getHeight() + size * 3f);
            float edgeFade = Math.min(1f, Math.min(cycle / .1f, (1f - cycle) / .12f));
            int alpha = Math.max(0, Math.min(102, (int) (102 * edgeFade)));
            canvas.save();
            canvas.rotate(-9f + cycle * 20f, x, y);
            drawParticle(canvas, particle, x, y, size, alpha);
            canvas.restore();
        }
    }

    private void drawParticle(Canvas canvas, Particle particle, float x, float y, float size, int alpha) {
        switch (particle.kind) {
            case HISPANIOLA:
                paint.setAlpha(alpha);
                bounds.set(x - size / 2f, y - size / 2f, x + size / 2f, y + size / 2f);
                canvas.drawBitmap(hispaniolaMark, null, bounds, paint);
                paint.setAlpha(255);
                break;
            case BINANCE:
                drawBadge(canvas, x, y, size, Color.rgb(243, 186, 47), alpha, "", Color.BLACK);
                paint.setColor(withAlpha(Color.rgb(92, 67, 0), alpha));
                float d = size * .13f;
                drawDiamond(canvas, x, y, d);
                drawDiamond(canvas, x, y - d * 2.2f, d);
                drawDiamond(canvas, x, y + d * 2.2f, d);
                drawDiamond(canvas, x - d * 2.2f, y, d);
                drawDiamond(canvas, x + d * 2.2f, y, d);
                break;
            case BHD:
                drawBadge(canvas, x, y, size * 1.35f, Color.rgb(0, 136, 82), alpha, "BHD", Color.WHITE);
                break;
            case POPULAR:
                drawBadge(canvas, x, y, size * 1.55f, Color.rgb(0, 56, 130), alpha, "POPULAR", Color.WHITE);
                break;
            case ZELLE:
                drawBadge(canvas, x, y, size, Color.rgb(116, 20, 202), alpha, "Z", Color.WHITE);
                break;
            case PAYPAL:
                drawBadge(canvas, x, y, size, Color.rgb(0, 48, 135), alpha, "P", Color.WHITE);
                break;
            default:
                drawBadge(canvas, x, y, size, Color.rgb(5, 150, 105), alpha, particle.label, Color.WHITE);
                break;
        }
    }

    private void drawBadge(Canvas canvas, float x, float y, float size, int color, int alpha, String label, int textColor) {
        float halfWidth = size / 2f;
        float halfHeight = Math.min(size, size * .78f) / 2f;
        paint.setColor(withAlpha(color, Math.min(190, alpha + 72)));
        bounds.set(x - halfWidth, y - halfHeight, x + halfWidth, y + halfHeight);
        canvas.drawRoundRect(bounds, halfHeight * .42f, halfHeight * .42f, paint);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(Math.max(1f, size * .025f));
        paint.setColor(withAlpha(Color.WHITE, Math.min(150, alpha + 45)));
        canvas.drawRoundRect(bounds, halfHeight * .42f, halfHeight * .42f, paint);
        paint.setStyle(Paint.Style.FILL);
        if (!label.isEmpty()) {
            paint.setColor(withAlpha(textColor, Math.min(230, alpha + 110)));
            paint.setTypeface(android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD));
            paint.setTextSize(size * (label.length() > 3 ? .19f : .35f));
            paint.setTextAlign(Paint.Align.CENTER);
            Paint.FontMetrics metrics = paint.getFontMetrics();
            canvas.drawText(label, x, y - (metrics.ascent + metrics.descent) / 2f, paint);
        }
    }

    private void drawDiamond(Canvas canvas, float x, float y, float radius) {
        path.reset();
        path.moveTo(x, y - radius);
        path.lineTo(x + radius, y);
        path.lineTo(x, y + radius);
        path.lineTo(x - radius, y);
        path.close();
        canvas.drawPath(path, paint);
    }

    private static int withAlpha(int color, int alpha) {
        return Color.argb(Math.max(0, Math.min(255, alpha)), Color.red(color), Color.green(color), Color.blue(color));
    }

    private static final class Particle {
        final int kind;
        final float x;
        final float phase;
        final float speed;
        final float size;
        final float drift;
        final String label;

        Particle(int kind, float x, float phase, float speed, float size, float drift, String label) {
            this.kind = kind;
            this.x = x;
            this.phase = phase;
            this.speed = speed;
            this.size = size;
            this.drift = drift;
            this.label = label;
        }
    }
}
