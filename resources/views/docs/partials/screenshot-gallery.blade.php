@php
    $items = $items ?? [];
@endphp
@if (count($items))
<div class="gallery-grid">
    @foreach ($items as $item)
        @php
            $shotPath = storage_path("app/docs/screenshots/{$item['name']}.png");
            $hasShot = file_exists($shotPath);
        @endphp
        <div class="gallery-item">
            <div class="gallery-thumb">
                @if ($hasShot)
                    <img src="data:image/png;base64,{{ base64_encode(file_get_contents($shotPath)) }}" alt="{{ $item['label'] }}" />
                @else
                    @include('docs.partials.illustrations', ['type' => $item['fallback'] ?? 'default'])
                @endif
            </div>
            <p class="gallery-label">{{ $item['label'] }}</p>
        </div>
    @endforeach
</div>
@endif
