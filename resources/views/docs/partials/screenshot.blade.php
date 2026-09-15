@php
    $name = $name ?? 'default';
    $caption = $caption ?? null;
    $fallback = $fallback ?? 'default';
    $shotPath = storage_path("app/docs/screenshots/{$name}.png");
    $hasShot = file_exists($shotPath);
@endphp

<figure class="screenshot-figure">
    <div class="screenshot-box">
        @if ($hasShot)
            <img
                src="data:image/png;base64,{{ base64_encode(file_get_contents($shotPath)) }}"
                alt="{{ $caption ?? $name }}"
                class="screenshot-img"
            />
        @else
            @include('docs.partials.illustrations', ['type' => $fallback])
        @endif
    </div>
    @if ($caption)
        <figcaption class="screenshot-caption">{{ $caption }}</figcaption>
    @endif
    @if ($hasShot)
        <p class="screenshot-badge">📷 ภาพจากหน้าจอจริง</p>
    @endif
</figure>
