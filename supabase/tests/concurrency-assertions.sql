SELECT test.assert_true((SELECT quantity=4 FROM public.cleanos_balances
  WHERE org_id=:'org_a' AND product_id='race-product' AND location_id='main'),
  'two simultaneous stock issues cannot overdraw the balance');
SELECT test.assert_true((SELECT count(*)=2 FROM public.cleanos_stock_movements
  WHERE org_id=:'org_a' AND product_id='race-product'),
  'only the successful concurrent stock issue enters the ledger');
SELECT test.assert_true((SELECT quantity=4 FROM public.cleanos_balances
  WHERE org_id=:'org_a' AND product_id='replay-product' AND location_id='main'),
  'simultaneous duplicate requests apply a single stock change');
SELECT test.assert_true((SELECT count(*)=2 FROM public.cleanos_stock_movements
  WHERE org_id=:'org_a' AND product_id='replay-product'),
  'simultaneous duplicate requests produce one audit movement');
