use bevy::asset::RenderAssetUsages;
use bevy::input::mouse::MouseMotion;
use bevy::prelude::*;
use bevy::render::mesh::{Indices, PrimitiveTopology};
use std::f32::consts::TAU;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen(start)]
pub fn start() {
    log("Hello world from Rust/Wasm!");

    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                canvas: Some("#pendant-canvas".into()),
                fit_canvas_to_parent: true,
                ..default()
            }),
            ..default()
        }))
        .add_systems(Startup, setup)
        .add_systems(Update, rotate_horizontal)
        .run();
}

#[derive(Component)]
struct Pendant;

fn setup(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    let mesh = rounded_box(3.2, 1.8, 0.16, 0.24, 8);

    commands.spawn((
        Mesh3d(meshes.add(mesh)),
        MeshMaterial3d(materials.add(StandardMaterial {
            base_color: Color::srgb(0.85, 0.7, 0.35),
            metallic: 0.9,
            perceptual_roughness: 0.25,
            ..default()
        })),
        Pendant,
    ));

    commands.spawn((
        DirectionalLight {
            illuminance: 6000.0,
            ..default()
        },
        Transform::from_xyz(4.0, 6.0, 4.0).looking_at(Vec3::ZERO, Vec3::Y),
    ));

    commands.spawn((
        Camera3d::default(),
        Transform::from_xyz(0.0, 0.0, 5.0).looking_at(Vec3::ZERO, Vec3::Y),
    ));
}

fn rotate_horizontal(
    buttons: Res<ButtonInput<MouseButton>>,
    mut motion: MessageReader<MouseMotion>,
    mut q: Query<&mut Transform, With<Pendant>>,
) {
    if !buttons.pressed(MouseButton::Left) {
        motion.clear();
        return;
    }
    let dx: f32 = motion.read().map(|m| m.delta.x).sum();
    for mut t in &mut q {
        t.rotate_y(dx * 0.01);
    }
}

// Gera o mesh: retângulo wxh com cantos de raio r, extrudado em profundidade d.
// seg = segmentos por canto (mais = cantos mais lisos)
fn rounded_box(w: f32, h: f32, d: f32, r: f32, seg: usize) -> Mesh {
    let r = r.min(w / 2.0).min(h / 2.0);
    let hw = w / 2.0 - r;
    let hh = h / 2.0 - r;
    let hz = d / 2.0;

    // Contorno 2D (anti-horário), com os 4 cantos desenhados como arcos.
    let mut outline: Vec<Vec2> = Vec::new();
    let corners = [
        (Vec2::new(hw, hh), 0.0),
        (Vec2::new(-hw, hh), TAU * 0.25),
        (Vec2::new(-hw, -hh), TAU * 0.5),
        (Vec2::new(hw, -hh), TAU * 0.75),
    ];
    for (center, start) in corners {
        for i in 0..=seg {
            let a = start + (i as f32 / seg as f32) * (TAU / 4.0);
            outline.push(center + Vec2::new(a.cos(), a.sin()) * r);
        }
    }

    let n = outline.len();
    let mut positions: Vec<[f32; 3]> = Vec::new();
    let mut normals: Vec<[f32; 3]> = Vec::new();
    let mut indices: Vec<u32> = Vec::new();

    // Faces da frente e de trás, montadas como um leque a partir do centro.
    for (sign, nz) in [(hz, 1.0f32), (-hz, -1.0f32)] {
        let center_idx = positions.len() as u32;
        positions.push([0.0, 0.0, sign]);
        normals.push([0.0, 0.0, nz]);
        let base = positions.len() as u32;
        for p in &outline {
            positions.push([p.x, p.y, sign]);
            normals.push([0.0, 0.0, nz]);
        }
        for i in 0..n as u32 {
            let a = base + i;
            let b = base + (i + 1) % n as u32;
            if nz > 0.0 {
                indices.extend([center_idx, a, b]);
            } else {
                indices.extend([center_idx, b, a]);
            }
        }
    }

    // Parede lateral que liga a face da frente à de trás (a "profundidade").
    let side_base = positions.len() as u32;
    for p in &outline {
        let nrm = p.normalize_or_zero();
        positions.push([p.x, p.y, hz]);
        normals.push([nrm.x, nrm.y, 0.0]);
        positions.push([p.x, p.y, -hz]);
        normals.push([nrm.x, nrm.y, 0.0]);
    }
    for i in 0..n as u32 {
        let a = side_base + i * 2;
        let b = side_base + ((i + 1) % n as u32) * 2;
        indices.extend([a, a + 1, b]);
        indices.extend([b, a + 1, b + 1]);
    }

    Mesh::new(
        PrimitiveTopology::TriangleList,
        RenderAssetUsages::default(),
    )
    .with_inserted_attribute(Mesh::ATTRIBUTE_POSITION, positions)
    .with_inserted_attribute(Mesh::ATTRIBUTE_NORMAL, normals)
    .with_inserted_indices(Indices::U32(indices))
}
