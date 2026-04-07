'use client';

import {useForm} from "react-hook-form";
import {Button} from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import SelectField from "@/components/forms/SelectField";
import {INVESTMENT_GOALS, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS} from "@/lib/constants";
import {CountrySelectField} from "@/components/forms/CountrySelectField";
import FooterLink from "@/components/forms/FooterLink";
import {signUpWithEmail} from "@/lib/actions/auth.actions";
import {useRouter} from "next/navigation";
import {toast} from "sonner";

const SignUp = () => {
    const router = useRouter()
    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm<SignUpFormData>({
        defaultValues: {
            fullName: '',
            email: '',
            password: '',
            country: 'US',
            investmentGoals: 'Growth',
            riskTolerance: 'Medium',
            preferredIndustry: 'Technology'
        },
        mode: 'onBlur'
    }, );

    const onSubmit = async (data: SignUpFormData) => {
        try {
            const result = await signUpWithEmail(data);
            if(result.success) router.push('/');
        } catch (e) {
            console.error(e);
            toast.error('สมัครสมาชิกไม่สำเร็จ', {
                description: e instanceof Error ? e.message : 'ไม่สามารถสร้างบัญชีได้'
            })
        }
    }

    return (
        <>
            <h1 className="form-title">สมัครสมาชิกและตั้งค่าการลงทุน</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="fullName"
                    label="ชื่อ - นามสกุล"
                    placeholder="สมชาย ใจดี"
                    register={register}
                    error={errors.fullName}
                    validation={{ required: 'กรุณากรอกชื่อ - นามสกุล', minLength: { value: 2, message: 'กรุณากรอกชื่อให้ครบถ้วน' } }}
                />

                <InputField
                    name="email"
                    label="อีเมล"
                    placeholder="name@example.com"
                    register={register}
                    error={errors.email}
                    validation={{ required: 'กรุณากรอกอีเมล', pattern: /^\w+@\w+\.\w+$/, message: 'กรุณากรอกอีเมลให้ถูกต้อง' }}
                />

                <InputField
                    name="password"
                    label="รหัสผ่าน"
                    placeholder="ตั้งรหัสผ่านที่ปลอดภัย"
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{ required: 'กรุณากรอกรหัสผ่าน', minLength: { value: 8, message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' } }}
                />

                <CountrySelectField
                    name="country"
                    label="ประเทศ"
                    control={control}
                    error={errors.country}
                    required
                />

                <SelectField
                    name="investmentGoals"
                    label="เป้าหมายการลงทุน"
                    placeholder="เลือกเป้าหมายการลงทุน"
                    options={INVESTMENT_GOALS}
                    control={control}
                    error={errors.investmentGoals}
                    required
                />

                <SelectField
                    name="riskTolerance"
                    label="ระดับความเสี่ยงที่ยอมรับได้"
                    placeholder="เลือกระดับความเสี่ยง"
                    options={RISK_TOLERANCE_OPTIONS}
                    control={control}
                    error={errors.riskTolerance}
                    required
                />

                <SelectField
                    name="preferredIndustry"
                    label="อุตสาหกรรมที่สนใจ"
                    placeholder="เลือกอุตสาหกรรมที่สนใจ"
                    options={PREFERRED_INDUSTRIES}
                    control={control}
                    error={errors.preferredIndustry}
                    required
                />

                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? 'กำลังสร้างบัญชี...' : 'เริ่มต้นเส้นทางการลงทุน'}
                </Button>

                <FooterLink text="มีบัญชีอยู่แล้วใช่ไหม?" linkText="เข้าสู่ระบบ" href="/sign-in" />
            </form>
        </>
    )
}
export default SignUp;
