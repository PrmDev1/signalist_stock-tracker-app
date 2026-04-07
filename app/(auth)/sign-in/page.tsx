'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import FooterLink from '@/components/forms/FooterLink';
import {signInWithEmail, signUpWithEmail} from "@/lib/actions/auth.actions";
import {toast} from "sonner";
import {signInEmail} from "better-auth/api";
import {useRouter} from "next/navigation";

const SignIn = () => {
    const router = useRouter()
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInFormData>({
        defaultValues: {
            email: '',
            password: '',
        },
        mode: 'onBlur',
    });

    const onSubmit = async (data: SignInFormData) => {
        try {
            const result = await signInWithEmail(data);
            if(result.success) router.push('/');
        } catch (e) {
            console.error(e);
            toast.error('เข้าสู่ระบบไม่สำเร็จ', {
                description: e instanceof Error ? e.message : 'ไม่สามารถเข้าสู่ระบบได้'
            })
        }
    }

    return (
        <>
            <h1 className="form-title">ยินดีต้อนรับกลับ</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="email"
                    label="อีเมล"
                    placeholder="name@example.com"
                    register={register}
                    error={errors.email}
                    validation={{ required: 'กรุณากรอกอีเมล', pattern: /^\w+@\w+\.\w+$/ }}
                />

                <InputField
                    name="password"
                    label="รหัสผ่าน"
                    placeholder="กรอกรหัสผ่านของคุณ"
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{ required: 'กรุณากรอกรหัสผ่าน', minLength: { value: 8, message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' } }}
                />

                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </Button>

                <FooterLink text="ยังไม่มีบัญชีใช่ไหม?" linkText="สมัครสมาชิก" href="/sign-up" />
            </form>
        </>
    );
};
export default SignIn;
