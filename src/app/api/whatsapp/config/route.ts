import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppService, WhatsAppConfig } from '@/lib/whatsapp/service';
import { getWhatsAppServerConfig, saveWhatsAppServerConfig } from '@/lib/server-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const persisted = getWhatsAppServerConfig();
  const config = WhatsAppService.getConfig();
  const effectiveConfig = {
    ...persisted,
    ...config,
    apiToken: config.apiToken || persisted.apiToken || '',
    phoneNumberId: config.phoneNumberId || persisted.phoneNumberId || '',
  };

  return NextResponse.json({
    success: true,
    config: {
      enabled: effectiveConfig.enabled,
      provider: effectiveConfig.provider,
      phoneNumberId: effectiveConfig.phoneNumberId,
      businessAccountId: effectiveConfig.businessAccountId,
      gatewayUrl: effectiveConfig.gatewayUrl,
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
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      enabled,
      provider,
      apiToken,
      phoneNumberId,
      businessAccountId,
      gatewayUrl,
      notifySender,
      notifyRecipient,
      notifyInvoices,
      senderTemplate,
      recipientTemplate,
    } = body;

    const updatedPartial: Partial<WhatsAppConfig> = {};

    if (enabled !== undefined) updatedPartial.enabled = Boolean(enabled);
    if (provider !== undefined) updatedPartial.provider = provider;
    if (apiToken !== undefined) updatedPartial.apiToken = String(apiToken).trim();
    if (phoneNumberId !== undefined) updatedPartial.phoneNumberId = String(phoneNumberId).trim();
    if (businessAccountId !== undefined) updatedPartial.businessAccountId = String(businessAccountId).trim();
    if (gatewayUrl !== undefined) updatedPartial.gatewayUrl = String(gatewayUrl).trim();
    if (notifySender !== undefined) updatedPartial.notifySender = Boolean(notifySender);
    if (notifyRecipient !== undefined) updatedPartial.notifyRecipient = Boolean(notifyRecipient);
    if (notifyInvoices !== undefined) updatedPartial.notifyInvoices = Boolean(notifyInvoices);
    if (senderTemplate !== undefined) updatedPartial.senderTemplate = senderTemplate;
    if (recipientTemplate !== undefined) updatedPartial.recipientTemplate = recipientTemplate;

    const newConfig = WhatsAppService.setConfig(updatedPartial);
    saveWhatsAppServerConfig(newConfig);

    return NextResponse.json({
      success: true,
      message: 'Configuración de WhatsApp guardada exitosamente y persistida en el servidor',
      config: {
        enabled: newConfig.enabled,
        provider: newConfig.provider,
        phoneNumberId: newConfig.phoneNumberId,
        businessAccountId: newConfig.businessAccountId,
        gatewayUrl: newConfig.gatewayUrl,
        notifySender: newConfig.notifySender,
        notifyRecipient: newConfig.notifyRecipient,
        notifyInvoices: newConfig.notifyInvoices,
        hasToken: Boolean(newConfig.apiToken && newConfig.apiToken.trim().length > 0),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error guardando configuración de WhatsApp' },
      { status: 500 }
    );
  }
}

