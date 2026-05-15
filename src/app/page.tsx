import Image from "next/image";
import PetTagScene from "@/features/pet-tag/components/PetTagScene";

export default function HomePage() {
  return (
    <main className="bg-[#F3F4F2] text-ink min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-20 flex items-center gap-3 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-black/5">
        <Image
          src="/logo.svg"
          alt="ViewPet"
          width={32}
          height={32}
          className="rounded-lg"
        />
        <span className="text-lg font-bold tracking-tight text-ink">
          ViewPet
        </span>
      </header>

      <section className="relative h-screen bg-[#F3F4F2]">
        <div className="absolute top-20 inset-x-0 z-10 text-center px-4 pointer-events-none">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Pingente personalizado para o seu pet
          </h1>
          <p className="mt-2 text-sm text-muted">
            Digite o nome abaixo e visualize em 3D
          </p>
        </div>
        <PetTagScene />
      </section>

      <section className="max-w-2xl mx-auto px-6 py-20 text-center bg-white">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Identifique seu pet com estilo
        </h2>
        <p className="mt-4 text-muted leading-relaxed">
          Pingentes em metal com o nome do seu pet gravado. Resistentes,
          elegantes e conectados a uma página digital com todas as informações
          do seu animal.
        </p>
        <div className="mt-12 grid grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold text-sm text-ink">Personalizado</h3>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              Nome gravado com acabamento em esmalte escuro
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-ink">Resistente</h3>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              Metal inoxidável de alta durabilidade
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-ink">Conectado</h3>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              QR code com página digital do pet
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
