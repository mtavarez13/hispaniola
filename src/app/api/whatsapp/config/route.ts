import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppService, WhatsAppConfig } from '@/lib/whatsapp/service';
import { getPersistentWhatsAppServerConfig, savePersistentWhatsAppServerConfig } from '@/lib/server-config';
import { adminAuthError, requireAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const webhookUrl = process.env.WHATSAPP_WEBHOOK_PUBLIC_URL ||
  'https://hispaniola--studio-4779362907-870c5.us-east4.hosted.app/api/whatsapp/webhook';

export async function GET(req: NextRequest) {
  try {
  await requireAdmin(req, { requireSettings: true });
  const persisted = await getPersistentWhatsAppServerConfig();
  const config = WhatsAppService.getConfig();
  const effectiveConfig = {
    ...persisted,
    ...config,
    apiToken: config.apiToken || persisted.apiToken || '',
    phoneNumberId: config.phoneNumberId || persisted.phoneNumberId || '',
    businessAccountId: config.businessAccountId || persisted.businessAccountId || '',
    webhookVerifyToken: config.webhookVerifyToken || persisted.webhookVerifyToken || '',
    appSecret: config.appSecret || persisted.appSecret || '',
  };

  return NextResponse.json({
    success: true,
    config: {
      enabled: effectiveConfig.enabled,
      provider: effectiveConfig.provider,
      phoneNumberId: effectiveConfig.phoneNumberId,
      businessAccountId: effectiveConfig.businessAccountId,
      webhookVerifyToken: effectiveConfig.webhookVerifyToken,
      hasAppSecret: Boolean(effectiveConfig.appSecret),
      appSecret: effectiveConfig.appSecret,
      webhookUrl,
      notifySender: effectiveConfig.notifySender,
      notifyRecipient: effectiveConfig.notifyRecipient,
      notifyInvoices: effectiveConfig.notifyInvoices,
      hasToken: Boolean(effectiveConfig.apiToken && effectiveConfig.apiToken.trim().length > 0),
      maskedToken: effectiveConfig.apiToken
        ? `${effectiveConfig.apiToken.slice(0, 6)}••••••••${effectiveConfig.apiToken.slice(-4)}`
        : '',
      apiToken: effectiveConfig.apiToken, // Para recarga en el formulario administrativo
    },
  });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req, { requireSettings: true });
    const body = await req.json();
    const {
      enabled,
      provider,
      apiToken,
      phoneNumberId,
      businessAccountId,
      notifySender,
      notifyRecipient,
      notifyInvoices,
      senderTemplate,
      recipientTemplate,
      webhookVerifyToken,
      appSecret,
    } = body;

    const updatedPartial: Partial<WhatsAppConfig> = {};

    if (enabled !== undefined) updatedPartial.enabled = Boolean(enabled);
    if (provider !== undefined) updatedPartial.provider = provider === 'direct_web' ? 'direct_web' : 'cloud_api';
    if (apiToken !== undefined) updatedPartial.apiToken = String(apiToken).trim();
    if (phoneNumberId !== undefined) updatedPartial.phoneNumberId = String(phoneNumberId).trim();
    if (businessAccountId !== undefined) updatedPartial.businessAccountId = String(businessAccountId).trim();
    if (notifySender !== undefined) updatedPartial.notifySender = Boolean(notifySender);
    if (notifyRecipient !== undefined) updatedPartial.notifyRecipient = Boolean(notifyRecipient);
    if (notifyInvoices !== undefined) updatedPartial.notifyInvoices = Boolean(notifyInvoices);
    if (senderTemplate !== undefined) updatedPartial.senderTemplate = senderTemplate;
    if (recipientTemplate !== undefined) updatedPartial.recipientTemplate = recipientTemplate;
    if (webhookVerifyToken !== undefined) updatedPartial.webhookVerifyToken = String(webhookVerifyToken).trim();
    if (appSecret !== undefined) updatedPartial.appSecret = String(appSecret).trim();

    const newConfig = WhatsAppService.setConfig(updatedPartial);
    await savePersistentWhatsAppServerConfig(newConfig);

    return NextResponse.json({
      success: true,
      message: 'Configuración de WhatsApp guardada exitosamente y persistida en el servidor',
      config: {
        enabled: newConfig.enabled,
        provider: newConfig.provider,
        phoneNumberId: newConfig.phoneNumberId,
        businessAccountId: newConfig.businessAccountId,
        webhookVerifyToken: newConfig.webhookVerifyToken,
        webhookUrl,
        notifySender: newConfig.notifySender,
        notifyRecipient: newConfig.notifyRecipient,
        notifyInvoices: newConfig.notifyInvoices,
        hasToken: Boolean(newConfig.apiToken && newConfig.apiToken.trim().length > 0),
      },
    });
  } catch (err: any) {
    const authError = adminAuthError(err);
    if (authError.status === 401 || String(err?.message || '').includes('FORBIDDEN')) {
      return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
    }
    return NextResponse.json(
      { success: false, error: err.message || 'Error guardando configuración de WhatsApp' },
      { status: 500 }
    );
  }
}
