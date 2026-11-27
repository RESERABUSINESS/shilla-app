import { router } from 'expo-router';
import { Image, View } from 'react-native';

import { Button, Notice, Row, Screen, T } from '@/components/ui';

const FEATURES = [
  'تختار هواياتك: بادل، جري، فخار، رسم، قراءة، قهوة، هايكنج وغيرها',
  'يطلع لك الملاعب والاستوديوهات والأماكن القريبة لكل هواية',
  'تنضم لجلسة مع ناس بنفس اهتمامك، أو تحجز ورشة من استوديو',
];

export default function Welcome() {
  return (
    <Screen
      footer={
        <View style={{ gap: 10 }}>
          <Button label="أنشئ حساب" onPress={() => router.push('/verify')} />
          <Button kind="secondary" label="عندي حساب، سجّل دخول" onPress={() => router.push('/login')} />
        </View>
      }>
      <View style={{ marginTop: 32, gap: 16 }}>
        <Row style={{ gap: 14 }}>
          <Image source={require('../../../assets/images/icon.png')} style={{ width: 72, height: 72, borderRadius: 18 }} accessibilityIgnoresInvertColors />
          <View>
            <T variant="title" style={{ fontSize: 40 }}>صحبة</T>
            <T variant="muted" style={{ letterSpacing: 2 }}>SOHBA</T>
          </View>
        </Row>
        <T variant="heading" style={{ fontSize: 22, lineHeight: 34 }}>لاقِ ناس يشاركونك هوايتك، قريبين منك، وتمارسونها سوا.</T>
        {FEATURES.map((f, i) => (
          <T key={f} style={{ lineHeight: 24 }}>{`${i + 1}. ${f}`}</T>
        ))}
        <Notice>عالم البنات منفصل تمامًا عن عالم الشباب: الناس والجلسات والمحادثات.</Notice>
      </View>
    </Screen>
  );
}
