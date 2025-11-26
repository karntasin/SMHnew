<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdCourseCategory extends Model
{
    protected $fillable = ['name', 'slug'];

    public function courses()
    {
        return $this->hasMany(HrdCourse::class, 'category_id');
    }
}
