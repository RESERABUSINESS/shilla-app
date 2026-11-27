import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { Icon } from '@/components/Icon';
import { Card, Row, Screen, T, useTheme } from '@/components/ui';

const RULES = [
  'احترم الكل. ممنوع التحرش أو الإزعاج أو الكلام المسيء أو التمييز.',
  'عالم البنات وعالم الشباب منفصلين. ممنوع أي محاولة للتواصل بين الجهتين أو التحايل على هالفصل.',
  'استخدم اسمك الحقيقي، وممنوع انتحال شخصية أحد.',
  'ممنوع المحتوى غير اللائق، والإعلانات، وطلب الأموال.',
  'إذا انضميت لجلسة التزم فيها، وإذا ما تقدر تحضر انسحب بدري عشان غيرك ياخذ مكانك.',
  'التزم بأنظمة المكان وأوقاته، وتأكد من أوقات الرجال والنساء قبل تروح.',
  'إذا شفت شي غلط، بلّغ عنه أو احظر الشخص. نراجع البلاغات، والحسابات المخالفة نوقفها.',
];

const PRIVACY = [
  'نحفظ اسمك الأول وإيميلك وهواياتك وجلساتك ومحادثاتها، عشان يشتغل التطبيق.',
  'موقعك الدقيق محفوظ بشكل خاص وما يشوفه أي مستخدم. الناس يشوفون المسافة التقريبية بالكيلو بس.',
  'ما نبيع بياناتك لأي أحد.',
  'تقدر تحذف حسابك وكل بياناتك نهائيًا من الإعدادات في أي وقت.',
];

export default function Terms() {
  const c = useTheme();
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading">الشروط وقواعد المجتمع</T>
        <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => router.back()} hitSlop={12}>
          <Icon name="close" size={26} color={c.text} />
        </Pressable>
      </Row>
      <Card>
        <T style={{ fontWeight: '700' }}>قواعد شلة</T>
        {RULES.map((r, i) => (
          <T key={r} style={{ lineHeight: 24 }}>{`${(i + 1).toLocaleString('ar-SA')}. ${r}`}</T>
        ))}
      </Card>
      <Card>
        <T style={{ fontWeight: '700' }}>خصوصيتك</T>
        {PRIVACY.map((r) => (
          <T key={r} style={{ lineHeight: 24 }}>{`• ${r}`}</T>
        ))}
      </Card>
      <T variant="small">باستخدامك شلة، أنت توافق على هالقواعد. مخالفتها ممكن توقف حسابك.</T>
    </Screen>
  );
}
