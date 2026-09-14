"use client";

import React from "react";
import { PartnerApiAdminTab } from "@/components/admin/partner-api-admin-tab";

export default function PartnersApiPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PartnerApiAdminTab />
    </div>
  );
}
