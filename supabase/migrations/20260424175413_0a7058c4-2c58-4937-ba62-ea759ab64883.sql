-- Templates table
CREATE TABLE public.work_description_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_category charger_issue_category,
  root_cause charger_root_cause,
  template_text text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_fallback boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Unique active template per issue+root_cause combo (excluding fallback)
CREATE UNIQUE INDEX uniq_active_template_combo
  ON public.work_description_templates (issue_category, root_cause)
  WHERE is_active = true AND is_fallback = false;

-- Only one active fallback
CREATE UNIQUE INDEX uniq_active_fallback
  ON public.work_description_templates ((1))
  WHERE is_active = true AND is_fallback = true;

ALTER TABLE public.work_description_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates"
  ON public.work_description_templates FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Field admins can insert templates"
  ON public.work_description_templates FOR INSERT
  TO authenticated WITH CHECK (public.is_field_capture_admin(auth.uid()));

CREATE POLICY "Field admins can update templates"
  ON public.work_description_templates FOR UPDATE
  TO authenticated USING (public.is_field_capture_admin(auth.uid()));

CREATE POLICY "Field admins can delete templates"
  ON public.work_description_templates FOR DELETE
  TO authenticated USING (public.is_field_capture_admin(auth.uid()));

CREATE TRIGGER update_work_description_templates_updated_at
  BEFORE UPDATE ON public.work_description_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed templates
INSERT INTO public.work_description_templates (issue_category, root_cause, template_text, is_fallback) VALUES
('power_issue', 'hardware_fault', 'Upon arrival, diagnostics confirmed a hardware-level power fault affecting the charger''s ability to deliver charging sessions. I performed a complete inspection of the main power distribution components and isolated the failure to a specific hardware module. Following standard lockout/tagout procedures and verifying zero energy state, I replaced the faulty component with an OEM-approved replacement part. Post-repair testing confirmed full power delivery to all connectors and the unit is now operational.', false),
('power_issue', 'power_supply', 'Diagnostics indicated a failure in the charger''s internal power supply, resulting in complete loss of power to the charging system. I safely isolated the unit following lockout/tagout protocols and verified zero energy state before proceeding. The failed power supply unit was removed and replaced with an OEM-specified replacement. After installation, I conducted incremental power-up testing and verified all voltage levels were within specification before restoring service.', false),
('screen_display', 'hardware_fault', 'Upon arrival at the site, the charger displayed a complete display failure with no visible output to the user-facing screen. Initial diagnostics confirmed the issue was hardware-related, consistent with a failed display board assembly. I performed a complete replacement of the display unit following standard safety protocols, including lockout/tagout procedures to verify zero energy state. After replacement, I conducted a full functionality test to confirm the unit was operational and ready for public use.', false),
('screen_display', 'firmware', 'The charger''s display was non-responsive due to a firmware-level issue preventing proper communication between the display board and the main control unit. I connected to the charger''s diagnostic interface and performed a firmware update to the latest stable version approved by the manufacturer. After the update completed, I verified the display was functioning correctly and ran a full system health check to confirm all subsystems were communicating properly.', false),
('connector', 'physical_damage', 'Physical inspection revealed damage to the charging connector assembly that was preventing secure connection and safe charging. I documented the damage with photographs and replaced the connector with an OEM-approved replacement. The replacement was installed per manufacturer specifications, and I conducted a complete connector inspection to verify proper latch engagement, pin alignment, and cable integrity. Post-installation testing confirmed the connector was functioning within specification.', false),
('connector', 'wear', 'The charging connector showed signs of normal wear that had progressed to a level affecting reliable connection quality. I replaced the connector assembly with a new OEM-approved unit, ensuring proper cable routing and strain relief installation. After replacement, I verified mechanical engagement, conducted continuity testing on all pins, and confirmed the unit was restored to full operational status.', false),
('payment_processing', 'network', 'The charger was unable to process payment transactions due to network connectivity issues affecting communication with the payment gateway. I diagnosed the network configuration, verified physical connectivity, and re-established a stable connection to the payment processing system. After restoring connectivity, I ran test transactions to confirm end-to-end payment flow was functioning correctly and the charger was ready for customer use.', false),
('payment_processing', 'firmware', 'Transaction failures were traced to a firmware issue affecting the payment module''s ability to communicate with the backend processing system. I updated the charger firmware to the latest stable release, which included fixes for the identified payment communication issue. After the update, I performed successful test transactions and verified the payment system was processing correctly end-to-end.', false),
('network_connectivity', 'network', 'The charger was experiencing intermittent or complete loss of network connectivity, affecting its ability to communicate with the network operator and process customer sessions. I diagnosed the network path, identified the source of the connectivity issue, and restored stable communication with the central management system. Post-repair, I monitored the connection for stability and confirmed the charger was reporting normally to the network operator.', false),
('physical_damage', 'physical_damage', 'The unit had sustained physical damage requiring repair or component replacement. I assessed the extent of damage, documented findings with photographs, and performed the necessary repairs using OEM-approved parts and procedures. All safety protocols were followed throughout, including lockout/tagout verification. After repairs, I conducted a complete functional test to confirm the unit was safe for public use and operating within specification.', false),
('other', 'unknown', 'I performed a complete diagnostic assessment of the charger to identify the root cause of the reported issue. After systematic troubleshooting, I implemented the appropriate corrective action to restore full functionality. All work was performed following standard safety protocols and OEM guidelines. Post-repair testing confirmed the unit was operational and ready for customer use.', false),
(NULL, NULL, 'I arrived on site and conducted a thorough diagnostic assessment of the reported issue. After identifying the root cause, I performed the necessary corrective actions following all safety protocols including lockout/tagout procedures where applicable. All replacement parts used were OEM-approved and installed according to manufacturer specifications. Post-repair testing confirmed the unit was restored to full operational status and is ready for customer use.', true);