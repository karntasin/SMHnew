<?php

namespace App\Http\Requests\Settings;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ProfileUpdateRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $chatName = trim((string) $this->input('chat_display_name', ''));
        $this->merge([
            'chat_display_name' => $chatName === '' ? null : $chatName,
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
            'chat_display_name' => ['nullable', 'string', 'max:80'],
            'department_ids' => ['sometimes', 'array', 'min:1'],
            'department_ids.*' => ['integer', 'exists:departments,id'],
            'primary_department_id' => ['required_with:department_ids', 'integer', 'exists:departments,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'กรุณากรอกชื่อ-นามสกุล',
            'email.required' => 'กรุณากรอกอีเมล',
            'department_ids.min' => 'กรุณาเลือกแผนกอย่างน้อย 1 แผนก',
            'primary_department_id.required_with' => 'กรุณาเลือกแผนกหลัก',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $ids = $this->input('department_ids');
            $primary = $this->input('primary_department_id');
            if (! is_array($ids) || $primary === null || $primary === '') {
                return;
            }

            $selected = array_map('intval', $ids);
            if (! in_array((int) $primary, $selected, true)) {
                $validator->errors()->add('primary_department_id', 'แผนกหลักต้องอยู่ในแผนกที่เลือก');
            }
        });
    }
}
