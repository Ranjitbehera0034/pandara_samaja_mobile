// Bundled locally (not fetched from a backend) since this is a small, fixed
// set of evergreen photos — a festival's image essentially never changes,
// unlike its date, which does need yearly curation (see odiaFestivals.ts).
// Bundling means zero network latency and it works offline; ships via OTA
// like everything else here since it's just JS + assets, no native code.
// require() needs a static string literal per call, so this can't be built
// from a loop — every entry has to be listed explicitly.
//
// 26 of the 27 originally-requested festival photos are available. Missing:
// ganesh_chaturthi (needs to be generated and dropped into assets/festivals/
// as ganesh_chaturthi.jpg, then added below).
export const FESTIVAL_IMAGES: Record<string, any> = {
  makar_sankranti: require('../../assets/festivals/makar_sankranti.jpg'),
  republic_day: require('../../assets/festivals/republic_day.jpg'),
  saraswati_puja: require('../../assets/festivals/saraswati_puja.jpg'),
  maha_shivaratri: require('../../assets/festivals/maha_shivaratri.jpg'),
  holi: require('../../assets/festivals/holi.jpg'),
  utkal_divas: require('../../assets/festivals/utkal_divas.jpg'),
  ram_navami: require('../../assets/festivals/ram_navami.jpg'),
  pana_sankranti: require('../../assets/festivals/pana_sankranti.jpg'),
  akshaya_tritiya: require('../../assets/festivals/akshaya_tritiya.jpg'),
  chandan_yatra: require('../../assets/festivals/chandan_yatra.jpg'),
  snana_purnima: require('../../assets/festivals/snana_purnima.jpg'),
  raja_parba: require('../../assets/festivals/raja_parba.jpg'),
  ratha_yatra: require('../../assets/festivals/ratha_yatra.jpg'),
  raksha_bandhan: require('../../assets/festivals/raksha_bandhan.jpg'),
  independence_day: require('../../assets/festivals/independence_day.jpg'),
  janmashtami: require('../../assets/festivals/janmashtami.jpg'),
  nuakhai: require('../../assets/festivals/nuakhai.jpg'),
  kumar_purnima: require('../../assets/festivals/kumar_purnima.jpg'),
  durga_puja: require('../../assets/festivals/durga_puja.jpg'),
  kartik_purnima: require('../../assets/festivals/kartik_purnima.jpg'),
  gandhi_jayanti: require('../../assets/festivals/gandhi_jayanti.jpg'),
  diwali: require('../../assets/festivals/diwali.jpg'),
  bhai_jiuntia: require('../../assets/festivals/bhai_jiuntia.jpg'),
  prathamastami: require('../../assets/festivals/prathamastami.jpg'),
  chhena_poda_day: require('../../assets/festivals/chhena_poda_day.jpg'),
  christmas: require('../../assets/festivals/christmas.jpg'),
};
