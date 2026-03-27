# Phase 3 Summary

**FIX 1 \[CRITICAL\]** OCR system_config key --- ocr_calls_this_month →
**FIX 2 \[CRITICAL\]** fraud_flags RLS --- Aggregator needs scoped
**FIX 3 \[CRITICAL\]** Missing ocr_confidence_1/2/3 columns in
**FIX 4 \[CRITICAL\]** GPS_MISMATCH tolerance undefined --- add
**FIX 5 \[CRITICAL\]** Fraud score ≥80 does not block Collection Form
**FIX 6 \[CRITICAL\]** IST timezone silent bug in Vercel Edge Runtime
**FIX 7 \[CRITICAL\]** system_config RLS missing --- fraud threshold
**FIX 8 \[HIGH\]** Orphaned Supabase Storage objects on OCR failure +
**FIX 9 \[HIGH\]** Median weight client/server floating point divergence
**FIX 10 \[HIGH\]** updateBatchStatus() missing linked collections
**FIX 11 \[HIGH\]** \"Mark as IN_TRANSIT\" button not flagged for Phase
**FIX 12 \[HIGH\]** Edge Function cold-start not tested before Day 20
**FIX 13 \[MODERATE\]** 7-column History table violates 375px design
**FIX 14 \[MODERATE\]** G52 composite gate --- split into G52-A, G52-B,
### G52-C sub-gates
**FIX 15 \[MODERATE\]** Aggregator Profile page deferred scope
### G38 Gate Criterion G38 \-\-- Stitch Design Complete
### G39 \-\-- Gate Criterion G39: Dashboard Loads With Real Supabase
### G40 \-\-- Gate Criterion G40: Stats Cards Show Correct Live Values
### G41 \-\-- Gate Criterion G41: Fraud Alert Banner Renders Correctly
### G42 \-\-- Gate Criterion G42: Material Type Selection Works
### G43 \-\-- Gate Criterion G43: OCR Extracts Weight From 3 Photos \-\--
### G44 \-\-- Gate Criterion G44: Median Weight Computed Correctly \-\--
### G45 \-\-- Gate Criterion G45: GPS Coordinates Captured \-\-- Nominatim
### G46 \-\-- Gate Criterion G46: GPS_MISMATCH Fraud Condition Detected
### G47 \-\-- Gate Criterion G47: Complete Collection Submission
### G48 \-\-- Gate Criterion G48: Fraud Flags Triggered and Edge Function
### G39 3.2 Dashboard loads at Day 19 PM Supabase MCP VERIFY
### G40 3.2 All 4 stats cards show Day 19 PM Playwright VERIFY
### G41 3.2 Fraud alert banner Day 19 PM Supabase VERIFY
### G42 3.3 Step Material type card Day 20 AM Playwright VERIFY
### G43 3.3 Step OCR extracts weight Day 20 PM Fetch MCP + VERIFY
### G44 3.3 Step Median weight computed Day 20 PM Playwright VERIFY
### G45 3.3 Step GPS captured. Nominatim Day 21 AM Fetch MCP + VERIFY
### G46 3.3 Step GPS_MISMATCH condition Day 21 AM Supabase MCP VERIFY
### G47 3.3 Step Complete submission: 3 Day 21 PM Supabase VERIFY
### G48 3.3 Step Fraud flags inserted Day 21 PM Supabase VERIFY
### **G48 GREEN = Part 2 Complete**
### Gate G48 is verified GREEN \-\-- meaning the Collection Form\'s
### G48 must be verified GREEN: the full 4-step collection form submits
### G49 \-\-- Gate Criterion G49: Batch Created \-\-- Collections Linked
### G50 \-\-- Gate Criterion G50: Batch Status Updated to IN_TRANSIT \-\--
### G51 \-\-- Gate Criterion G51: Collection History Renders With All
### G38 3.1 Design Confirm all 7 Stitch exports at GREEN
### G39 3.2 Navigate /aggregator/ \-\-- all 4 GREEN
### G40 3.2 Cross-check stat card values via GREEN
### G41 3.2 Set fraud_score = 82, confirm GREEN
### G42 3.3 Step 1 Complete Step 1 with HDPE. GREEN
### G43 3.3 Step 2 Complete 3 photo slots. Confirm GREEN
### G44 3.3 Step 2 Verify OCR Summary Bar median and GREEN
### G45 3.3 Step 3 Confirm GPS ACQUIRED with GREEN
### G46 3.3 Step 3 Set facility GPS 1 km away. GREEN
### G47 3.3 Step 4 Submit full form. Confirm 3 GREEN
### G48 3.3 Step 4 Confirm fraud_flags rows and Edge GREEN
### G49 3.4 Batch Create batch. Confirm batches GREEN
### G50 3.4 Batch Mark IN_TRANSIT. Confirm status GREEN
### G51 3.5 History All 6 filter types work. Detail GREEN
### G52-A 3.6 HAPPY PATH: Full collection submission → GREEN
### G52-B 3.6 FRAUD PATH: Collection with OCR weight GREEN
### G52-C 3.6 PERFORMANCE + BUILD AUDIT: Dashboard \<2s GREEN
### G52 \-\-- Gate Criterion G52: Phase 3 Complete \-\-- All 15 Gates
### G38 3.1 Stitch All 7 Aggregator Part 1 Day 19 AM GREEN
### G39 3.2 Dashboard loads with Part 2 Day 19 PM GREEN
### G40 3.2 All 4 stat cards show Part 2 Day 19 PM GREEN
### G41 3.2 Fraud alert banner Part 2 Day 19 PM GREEN
### G42 3.3 Step 1 Material type Part 2 Day 20 AM GREEN
### G43 3.3 Step 2 OCR extracts weight Part 2 Day 20 PM GREEN
### G44 3.3 Step 2 Median weight correct Part 2 Day 20 PM GREEN
### G45 3.3 Step 3 GPS captured \-\-- Part 2 Day 21 AM GREEN
### G46 3.3 Step 3 GPS_MISMATCH detected Part 2 Day 21 AM GREEN
### G47 3.3 Step 4 Full submission: Part 2 Day 21 PM GREEN
### G48 3.3 Step 4 Fraud flags inserted Part 2 Day 21 PM GREEN
### G49 3.4 Batch Batch created \-\-- Part 3 Day 22 GREEN
### G50 3.4 Batch Batch status Part 3 Day 22 GREEN
### G51 3.5 History All filters work \-\-- Part 3 Day 23 GREEN
### G52 3.6 All 3 journeys pass Part 3 Day 24 GREEN
### **G52 GREEN = Phase 3 Complete**
